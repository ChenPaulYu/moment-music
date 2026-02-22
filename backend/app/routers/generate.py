import asyncio
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.engines import EngineType, get_engine, list_available_engines
from app.services.geocoding import location_text_to_latlon
from app.services.image_generation import generate_album_art
from app.services.jobs import job_store
from app.services.prompt_generation import (
    interpret_weather_to_music_prompt,
    interpret_weather_to_narration,
    interpret_weather_to_song,
)
from app.services.weather import get_weather_by_lat_lon
from app.utils.audio_mixing import mix_narration_and_music
from app.utils.helpers import estimate_song_duration, get_audio_duration

router = APIRouter()

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"

# Configurable defaults from .env
DEFAULT_ENGINE = os.getenv("DEFAULT_ENGINE", EngineType.ACE_STEP.value)
DEFAULT_DURATION = int(os.getenv("DEFAULT_DURATION", "30"))
DEFAULT_OUTPUT_TYPE = os.getenv("DEFAULT_OUTPUT_TYPE", "instrumental")


class GenerateRequest(BaseModel):
    location: str
    feeling: str = ""
    engine: str = DEFAULT_ENGINE
    duration: int = DEFAULT_DURATION
    output_type: str = DEFAULT_OUTPUT_TYPE  # "instrumental" | "song" | "narration"
    generate_image: bool = True
    style_prompts: dict | None = None


def _uid() -> str:
    return uuid4().hex[:12]


def _get_steps(output_type: str, generate_image: bool = False) -> list[str]:
    if output_type == "narration":
        steps = ["Interpreting mood", "Writing narration", "Generating voice", "Generating background music", "Mixing audio"]
    elif output_type == "song":
        steps = ["Interpreting mood", "Composing lyrics & tags", "Generating song"]
    else:
        steps = ["Interpreting mood", "Generating audio"]
    if generate_image:
        steps.append("Generating album art")
    steps.append("Finalizing")
    return steps


@router.post("/generate")
async def generate(req: GenerateRequest):
    # Validate output_type
    if req.output_type not in ("instrumental", "song", "narration"):
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid output_type: {req.output_type}. Must be instrumental, song, or narration."},
        )

    # Resolve music engine
    try:
        engine = get_engine(req.engine)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown engine: {req.engine}"},
        )

    if not engine.is_available():
        return JSONResponse(
            status_code=503,
            content={"error": f"Engine '{req.engine}' is not available in this environment"},
        )

    # For narration, check TTS availability before creating job (fail fast)
    if req.output_type == "narration":
        try:
            tts_engine = get_engine(EngineType.QWEN3_TTS)
            if not tts_engine.is_available():
                return JSONResponse(
                    status_code=503,
                    content={"error": "Narration requires Qwen3-TTS engine which is not available"},
                )
        except Exception:
            return JSONResponse(
                status_code=503,
                content={"error": "Narration requires Qwen3-TTS engine which is not available"},
            )

    if job_store.is_queue_full():
        return JSONResponse(
            status_code=503,
            content={"error": "Server is busy. Please try again in a moment."},
        )

    steps = _get_steps(req.output_type, generate_image=req.generate_image)
    job_id = job_store.create(mode="be", output_type=req.output_type, steps=steps)

    async def _run():
        try:
            async with job_store.acquire(job_id):
                if job_store.is_cancelled(job_id):
                    return

                if req.output_type == "narration":
                    result = await _handle_narration(req, engine, job_id=job_id)
                elif req.output_type == "song":
                    result = await _handle_song(req, engine, job_id=job_id)
                else:
                    result = await _handle_instrumental(req, engine, job_id=job_id)

                if result is not None:
                    job_store.complete(job_id, result)
        except asyncio.CancelledError:
            job_store.cancel(job_id)
        except Exception as e:
            job_store.fail(job_id, str(e))

    task = asyncio.create_task(_run())
    job_store.set_task(job_id, task)
    return {"job_id": job_id}


async def _handle_instrumental(req, engine, job_id: str | None = None):
    # 1. Geocode + weather
    if job_id:
        job_store.update_step(job_id, 0)
        if job_store.is_cancelled(job_id):
            return None

    latlon = location_text_to_latlon(req.location)
    if not latlon:
        raise ValueError(f"Could not geocode location: {req.location}")
    lat, lon = latlon

    weather = get_weather_by_lat_lon(lat, lon)
    if not weather:
        raise ValueError("Failed to fetch weather data")
    weather["city"] = req.location

    interpretation = await interpret_weather_to_music_prompt(weather, duration=req.duration, style_prompts=req.style_prompts, feeling=req.feeling)

    if job_id:
        job_store.update_step(job_id, 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    # Start album art in background (API call, doesn't need GPU)
    image_task = None
    if req.generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                weather["weather_desc"],
                style_prompts=req.style_prompts,
            )
        )

    await engine.generate(
        prompt=interpretation.suggested_prompt,
        duration=req.duration,
        output_path=output_path,
    )
    engine.unload()

    img_filename = None
    if image_task:
        if job_id:
            job_store.update_step(job_id, 2)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, 3 if req.generate_image else 2)

    result = {
        "output_type": "instrumental",
        "location": f"{lat:.4f}, {lon:.4f}",
        "weather_summary": f"{weather['city']} | {weather['temperature']}C | {weather['weather_desc']}",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "prompt": interpretation.suggested_prompt,
        "engine": req.engine,
        "audio_url": f"/audio/{filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result


async def _handle_song(req, engine, job_id: str | None = None):
    if job_id:
        job_store.update_step(job_id, 0)
        if job_store.is_cancelled(job_id):
            return None

    latlon = location_text_to_latlon(req.location)
    if not latlon:
        raise ValueError(f"Could not geocode location: {req.location}")
    lat, lon = latlon

    weather = get_weather_by_lat_lon(lat, lon)
    if not weather:
        raise ValueError("Failed to fetch weather data")
    weather["city"] = req.location

    interpretation = await interpret_weather_to_song(weather, duration=req.duration, style_prompts=req.style_prompts, feeling=req.feeling)

    if job_id:
        job_store.update_step(job_id, 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    # Let lyrics drive the duration
    song_duration = estimate_song_duration(interpretation.lyrics, target_duration=req.duration)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    if job_id:
        job_store.update_step(job_id, 2)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    image_task = None
    if req.generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                weather["weather_desc"],
                style_prompts=req.style_prompts,
            )
        )

    await engine.generate(
        prompt=interpretation.music_tags,
        duration=song_duration,
        output_path=output_path,
        lyrics=interpretation.lyrics,
        tags=interpretation.music_tags,
    )
    engine.unload()

    img_filename = None
    if image_task:
        if job_id:
            job_store.update_step(job_id, 3)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, 4 if req.generate_image else 3)

    result = {
        "output_type": "song",
        "location": f"{lat:.4f}, {lon:.4f}",
        "weather_summary": f"{weather['city']} | {weather['temperature']}C | {weather['weather_desc']}",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "lyrics": interpretation.lyrics,
        "music_tags": interpretation.music_tags,
        "engine": req.engine,
        "audio_url": f"/audio/{filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result


async def _handle_narration(req, engine, job_id: str | None = None):
    if job_id:
        job_store.update_step(job_id, 0)
        if job_store.is_cancelled(job_id):
            return None

    latlon = location_text_to_latlon(req.location)
    if not latlon:
        raise ValueError(f"Could not geocode location: {req.location}")
    lat, lon = latlon

    weather = get_weather_by_lat_lon(lat, lon)
    if not weather:
        raise ValueError("Failed to fetch weather data")
    weather["city"] = req.location

    interpretation = await interpret_weather_to_narration(weather, duration=req.duration, style_prompts=req.style_prompts, feeling=req.feeling)

    if job_id:
        job_store.update_step(job_id, 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    voice_filename = f"{_uid()}_voice.wav"
    music_filename = f"{_uid()}_bg.mp3"
    voice_path = AUDIO_DIR / voice_filename
    music_path = AUDIO_DIR / music_filename

    tts_engine = get_engine(EngineType.QWEN3_TTS)

    # Start image gen in background (doesn't need GPU)
    image_task = None
    if req.generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                weather["weather_desc"],
                style_prompts=req.style_prompts,
            )
        )

    # Generate TTS
    if job_id:
        job_store.update_step(job_id, 2)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    await tts_engine.generate(
        prompt=interpretation.narration_text,
        duration=0,
        output_path=voice_path,
    )
    tts_engine.unload()

    # Match background music to actual voice duration
    voice_duration = await asyncio.to_thread(get_audio_duration, voice_path)

    if job_id:
        job_store.update_step(job_id, 3)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    await engine.generate(
        prompt=interpretation.background_music_prompt,
        duration=voice_duration,
        output_path=music_path,
    )
    engine.unload()

    # Mix voice over background music
    if job_id:
        job_store.update_step(job_id, 4)
        if job_store.is_cancelled(job_id):
            return None

    final_filename = f"{_uid()}.mp3"
    final_path = AUDIO_DIR / final_filename
    await mix_narration_and_music(voice_path, music_path, final_path)

    img_filename = None
    if image_task:
        if job_id:
            job_store.update_step(job_id, 5)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, 6 if req.generate_image else 5)

    result = {
        "output_type": "narration",
        "location": f"{lat:.4f}, {lon:.4f}",
        "weather_summary": f"{weather['city']} | {weather['temperature']}C | {weather['weather_desc']}",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "narration_text": interpretation.narration_text,
        "background_music_prompt": interpretation.background_music_prompt,
        "engine": req.engine,
        "audio_url": f"/audio/{final_filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result


@router.get("/engines")
async def engines():
    return {"engines": list_available_engines()}
