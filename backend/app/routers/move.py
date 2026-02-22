import asyncio
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.engines import EngineType, get_engine
from app.services.image_generation import generate_album_art
from app.services.jobs import job_store
from app.services.motion_analysis import analyze_motion
from app.services.prompt_generation import (
    interpret_move_to_music_prompt,
    interpret_move_to_narration,
    interpret_move_to_song,
)
from app.utils.audio_mixing import mix_narration_and_music
from app.utils.helpers import estimate_song_duration, get_audio_duration

router = APIRouter()

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"

DEFAULT_ENGINE = os.getenv("DEFAULT_ENGINE", EngineType.ACE_STEP.value)
DEFAULT_DURATION = int(os.getenv("DEFAULT_DURATION", "30"))


def _uid() -> str:
    return uuid4().hex[:12]


class MoveGenerateRequest(BaseModel):
    motion_data: str
    output_type: str = "instrumental"
    engine: str = DEFAULT_ENGINE
    duration: int = DEFAULT_DURATION
    generate_image: bool = True
    style_prompts: dict | None = None


def _get_steps(output_type: str, generate_image: bool = False) -> list[str]:
    steps = ["Analyzing movement"]
    if output_type == "narration":
        steps += ["Interpreting mood", "Writing narration", "Generating voice", "Generating background music", "Mixing audio"]
    elif output_type == "song":
        steps += ["Interpreting mood", "Composing lyrics & tags", "Generating song"]
    else:
        steps += ["Interpreting mood", "Generating audio"]
    if generate_image:
        steps.append("Generating album art")
    steps.append("Finalizing")
    return steps


@router.post("/move/generate")
async def generate_move(req: MoveGenerateRequest):
    if not req.motion_data or not req.motion_data.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "Motion data is required."},
        )

    if req.output_type not in ("instrumental", "song", "narration"):
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid output_type: {req.output_type}. Must be instrumental, song, or narration."},
        )

    try:
        audio_engine = get_engine(req.engine)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown engine: {req.engine}"},
        )

    if not audio_engine.is_available():
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
    job_id = job_store.create(mode="move", output_type=req.output_type, steps=steps)

    async def _run():
        try:
            async with job_store.acquire(job_id):
                if job_store.is_cancelled(job_id):
                    return

                # Analyze motion (step 0)
                job_store.update_step(job_id, 0)
                motion_summary = analyze_motion(req.motion_data)

                if job_store.is_cancelled(job_id):
                    return

                step_offset = 1  # after "Analyzing movement"

                if req.output_type == "narration":
                    result = await _handle_narration(motion_summary, audio_engine, req.engine, req.duration, req.generate_image, req.style_prompts, job_id=job_id, step_offset=step_offset)
                elif req.output_type == "song":
                    result = await _handle_song(motion_summary, audio_engine, req.engine, req.duration, req.generate_image, req.style_prompts, job_id=job_id, step_offset=step_offset)
                else:
                    result = await _handle_instrumental(motion_summary, audio_engine, req.engine, req.duration, req.generate_image, req.style_prompts, job_id=job_id, step_offset=step_offset)

                if result is not None:
                    job_store.complete(job_id, result)
        except asyncio.CancelledError:
            job_store.cancel(job_id)
        except Exception as e:
            job_store.fail(job_id, str(e))

    task = asyncio.create_task(_run())
    job_store.set_task(job_id, task)
    return {"job_id": job_id}


async def _handle_instrumental(motion_summary, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_move_to_music_prompt(motion_summary, duration=duration, style_prompts=style_prompts)

    if job_id:
        job_store.update_step(job_id, step_offset + 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    image_task = None
    if generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                motion_summary[:100],
                style_prompts=style_prompts,
            )
        )

    await engine.generate(
        prompt=interpretation.suggested_prompt,
        duration=duration,
        output_path=output_path,
    )
    engine.unload()

    img_filename = None
    if image_task:
        if job_id:
            job_store.update_step(job_id, step_offset + 2)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, step_offset + (3 if generate_image else 2))

    result = {
        "mode": "move",
        "output_type": "instrumental",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "prompt": interpretation.suggested_prompt,
        "engine": engine_name,
        "audio_url": f"/audio/{filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result


async def _handle_song(motion_summary, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_move_to_song(motion_summary, duration=duration, style_prompts=style_prompts)

    if job_id:
        job_store.update_step(job_id, step_offset + 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    song_duration = estimate_song_duration(interpretation.lyrics, target_duration=duration)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    if job_id:
        job_store.update_step(job_id, step_offset + 2)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    image_task = None
    if generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                motion_summary[:100],
                style_prompts=style_prompts,
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
            job_store.update_step(job_id, step_offset + 3)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, step_offset + (4 if generate_image else 3))

    result = {
        "mode": "move",
        "output_type": "song",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "lyrics": interpretation.lyrics,
        "music_tags": interpretation.music_tags,
        "engine": engine_name,
        "audio_url": f"/audio/{filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result


async def _handle_narration(motion_summary, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_move_to_narration(motion_summary, duration=duration, style_prompts=style_prompts)

    if job_id:
        job_store.update_step(job_id, step_offset + 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    voice_filename = f"{_uid()}_voice.wav"
    music_filename = f"{_uid()}_bg.mp3"
    voice_path = AUDIO_DIR / voice_filename
    music_path = AUDIO_DIR / music_filename

    tts_engine = get_engine(EngineType.QWEN3_TTS)

    image_task = None
    if generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                motion_summary[:100],
                style_prompts=style_prompts,
            )
        )

    if job_id:
        job_store.update_step(job_id, step_offset + 2)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    await tts_engine.generate(
        prompt=interpretation.narration_text,
        duration=0,
        output_path=voice_path,
    )
    tts_engine.unload()

    voice_duration = await asyncio.to_thread(get_audio_duration, voice_path)

    if job_id:
        job_store.update_step(job_id, step_offset + 3)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    await engine.generate(
        prompt=interpretation.background_music_prompt,
        duration=voice_duration,
        output_path=music_path,
    )
    engine.unload()

    if job_id:
        job_store.update_step(job_id, step_offset + 4)
        if job_store.is_cancelled(job_id):
            return None

    final_filename = f"{_uid()}.mp3"
    final_path = AUDIO_DIR / final_filename
    await mix_narration_and_music(voice_path, music_path, final_path)

    img_filename = None
    if image_task:
        if job_id:
            job_store.update_step(job_id, step_offset + 5)
        img_filename = await image_task

    if job_id:
        job_store.update_step(job_id, step_offset + (6 if generate_image else 5))

    result = {
        "mode": "move",
        "output_type": "narration",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "narration_text": interpretation.narration_text,
        "background_music_prompt": interpretation.background_music_prompt,
        "engine": engine_name,
        "audio_url": f"/audio/{final_filename}",
    }
    if img_filename:
        result["image_url"] = f"/images/{img_filename}"
    return result
