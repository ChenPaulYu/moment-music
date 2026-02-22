import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.engines import EngineType, get_engine, list_available_engines
from app.services.geocoding import location_text_to_latlon
from app.services.prompt_generation import (
    interpret_weather_to_music_prompt,
    interpret_weather_to_narration,
    interpret_weather_to_song,
)
from app.services.weather import get_weather_by_lat_lon

router = APIRouter()

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"


class GenerateRequest(BaseModel):
    location: str
    engine: str = EngineType.ACE_STEP.value
    duration: int = 20
    output_type: str = "instrumental"  # "instrumental" | "song" | "narration"


def _uid() -> str:
    return uuid4().hex[:12]


async def _mix_narration_and_music(
    voice_path: Path, music_path: Path, output_path: Path
) -> Path:
    """Layer narration voice over background music using soundfile + numpy."""
    import numpy as np
    import soundfile as sf

    def _mix():
        voice, voice_sr = sf.read(str(voice_path), dtype="float32")
        music, music_sr = sf.read(str(music_path), dtype="float32")

        # Resample music to match voice sample rate if needed
        if music_sr != voice_sr:
            from fractions import Fraction

            ratio = Fraction(voice_sr, music_sr)
            indices = np.round(np.arange(0, len(music), music_sr / voice_sr)).astype(int)
            indices = indices[indices < len(music)]
            music = music[indices]

        # Ensure both are 1D (mono) for simple mixing
        if voice.ndim > 1:
            voice = voice.mean(axis=1)
        if music.ndim > 1:
            music = music.mean(axis=1)

        # Match lengths — trim music or pad voice
        target_len = max(len(voice), len(music))
        if len(voice) < target_len:
            voice = np.pad(voice, (0, target_len - len(voice)))
        if len(music) < target_len:
            # Loop music to fill duration
            repeats = (target_len // len(music)) + 1
            music = np.tile(music, repeats)[:target_len]
        else:
            music = music[:target_len]

        # Mix: voice at full volume, music ducked to 25%
        mixed = voice + music * 0.25
        # Normalize to prevent clipping
        peak = np.abs(mixed).max()
        if peak > 0.95:
            mixed = mixed * (0.95 / peak)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), mixed, samplerate=voice_sr)

    await asyncio.to_thread(_mix)
    return output_path


@router.post("/generate")
async def generate(req: GenerateRequest):
    try:
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

        # 1. Geocode location text → lat/lon
        latlon = location_text_to_latlon(req.location)
        if not latlon:
            return JSONResponse(
                status_code=400,
                content={"error": f"Could not geocode location: {req.location}"},
            )
        lat, lon = latlon

        # 2. Fetch weather data
        weather = get_weather_by_lat_lon(lat, lon)
        if not weather:
            return JSONResponse(
                status_code=502,
                content={"error": "Failed to fetch weather data"},
            )
        weather["city"] = req.location

        # 3–4. Branch by output type
        if req.output_type == "narration":
            return await _handle_narration(req, weather, engine, lat, lon)
        elif req.output_type == "song":
            return await _handle_song(req, weather, engine, lat, lon)
        else:
            return await _handle_instrumental(req, weather, engine, lat, lon)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


async def _handle_instrumental(req, weather, engine, lat, lon):
    interpretation = await interpret_weather_to_music_prompt(weather)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename
    await engine.generate(
        prompt=interpretation.suggested_prompt,
        duration=req.duration,
        output_path=output_path,
    )

    return {
        "output_type": "instrumental",
        "location": f"{lat:.4f}, {lon:.4f}",
        "weather_summary": f"{weather['city']} | {weather['temperature']}C | {weather['weather_desc']}",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "prompt": interpretation.suggested_prompt,
        "engine": req.engine,
        "audio_url": f"/audio/{filename}",
    }


async def _handle_song(req, weather, engine, lat, lon):
    interpretation = await interpret_weather_to_song(weather)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename
    await engine.generate(
        prompt=interpretation.music_tags,
        duration=req.duration,
        output_path=output_path,
        lyrics=interpretation.lyrics,
        tags=interpretation.music_tags,
    )

    return {
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


async def _handle_narration(req, weather, engine, lat, lon):
    interpretation = await interpret_weather_to_narration(weather, duration=req.duration)

    # Generate TTS voice and background music in parallel
    voice_filename = f"{_uid()}_voice.wav"
    music_filename = f"{_uid()}_bg.mp3"
    voice_path = AUDIO_DIR / voice_filename
    music_path = AUDIO_DIR / music_filename

    # Resolve TTS engine
    try:
        tts_engine = get_engine(EngineType.QWEN3_TTS)
        tts_available = tts_engine.is_available()
    except Exception:
        tts_available = False

    if not tts_available:
        return JSONResponse(
            status_code=503,
            content={"error": "Narration requires Qwen3-TTS engine which is not available"},
        )

    # Generate sequentially and unload between models to avoid MPS OOM
    await tts_engine.generate(
        prompt=interpretation.narration_text,
        duration=req.duration,
        output_path=voice_path,
    )
    tts_engine.unload()

    await engine.generate(
        prompt=interpretation.background_music_prompt,
        duration=req.duration,
        output_path=music_path,
    )
    engine.unload()

    # Mix voice over background music into final file
    final_filename = f"{_uid()}.mp3"
    final_path = AUDIO_DIR / final_filename
    await _mix_narration_and_music(voice_path, music_path, final_path)

    return {
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


@router.get("/engines")
async def engines():
    return {"engines": list_available_engines()}
