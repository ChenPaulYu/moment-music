import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.engines import EngineType, get_engine
from app.services.image_generation import generate_album_art
from app.services.jobs import job_store
from app.services.prompt_generation import (
    interpret_write_to_music_prompt,
    interpret_write_to_narration,
    interpret_write_to_song,
)
from app.services.vision import caption_image
from app.utils.audio_mixing import mix_narration_and_music
from app.utils.helpers import estimate_song_duration, get_audio_duration

router = APIRouter()

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"

DEFAULT_ENGINE = os.getenv("DEFAULT_ENGINE", EngineType.ACE_STEP.value)
DEFAULT_DURATION = int(os.getenv("DEFAULT_DURATION", "30"))


def _uid() -> str:
    return uuid4().hex[:12]


def _get_steps(output_type: str, has_image: bool = False) -> list[str]:
    steps = []
    if has_image:
        steps.append("Captioning image")
    if output_type == "narration":
        steps += ["Interpreting mood", "Writing narration", "Generating voice", "Generating background music", "Mixing audio", "Finalizing"]
    elif output_type == "song":
        steps += ["Interpreting mood", "Composing lyrics & tags", "Generating song", "Finalizing"]
    else:
        steps += ["Interpreting mood", "Generating audio", "Finalizing"]
    return steps


@router.post("/write/generate")
async def generate_write(
    text: str = Form(""),
    output_type: str = Form("instrumental"),
    engine: str = Form(DEFAULT_ENGINE),
    duration: int = Form(DEFAULT_DURATION),
    generate_image: str = Form("true"),
    style_prompts: str = Form(""),
    image: UploadFile | None = File(None),
):
    # Validate: at least text or image required
    has_text = bool(text.strip())
    has_image = image is not None and image.filename

    if not has_text and not has_image:
        return JSONResponse(
            status_code=400,
            content={"error": "Please provide text or an image (or both)."},
        )

    if output_type not in ("instrumental", "song", "narration"):
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid output_type: {output_type}. Must be instrumental, song, or narration."},
        )

    # Resolve music engine
    try:
        audio_engine = get_engine(engine)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown engine: {engine}"},
        )

    if not audio_engine.is_available():
        return JSONResponse(
            status_code=503,
            content={"error": f"Engine '{engine}' is not available in this environment"},
        )

    # For narration, check TTS availability before creating job (fail fast)
    if output_type == "narration":
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

    # Read image bytes now (before spawning async task, since UploadFile is request-scoped)
    image_bytes = None
    image_mime = None
    if has_image:
        image_bytes = await image.read()
        image_mime = image.content_type or "image/jpeg"

    parsed_styles = json.loads(style_prompts) if style_prompts else None
    want_image = generate_image.lower() == "true"
    entry_text = text.strip() if has_text else "An image moment."

    if job_store.is_queue_full():
        return JSONResponse(
            status_code=503,
            content={"error": "Server is busy. Please try again in a moment."},
        )

    steps = _get_steps(output_type, has_image=bool(has_image))
    job_id = job_store.create(mode="write", output_type=output_type, steps=steps)

    async def _run():
        try:
            async with job_store.acquire(job_id):
                if job_store.is_cancelled(job_id):
                    return

                step = 0
                # Caption image if provided
                image_caption = None
                if image_bytes:
                    job_store.update_step(job_id, step)
                    image_caption = await caption_image(image_bytes, image_mime)
                    step += 1
                    if job_store.is_cancelled(job_id):
                        return

                if output_type == "narration":
                    result = await _handle_narration(entry_text, image_caption, audio_engine, engine, duration, want_image, parsed_styles, job_id=job_id, step_offset=step)
                elif output_type == "song":
                    result = await _handle_song(entry_text, image_caption, audio_engine, engine, duration, want_image, parsed_styles, job_id=job_id, step_offset=step)
                else:
                    result = await _handle_instrumental(entry_text, image_caption, audio_engine, engine, duration, want_image, parsed_styles, job_id=job_id, step_offset=step)

                if result is not None:
                    job_store.complete(job_id, result)
        except asyncio.CancelledError:
            job_store.cancel(job_id)
        except Exception as e:
            job_store.fail(job_id, str(e))

    task = asyncio.create_task(_run())
    job_store.set_task(job_id, task)
    return {"job_id": job_id}


async def _handle_instrumental(text, image_caption, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_write_to_music_prompt(text, image_caption, duration=duration, style_prompts=style_prompts)

    if job_id:
        job_store.update_step(job_id, step_offset + 1)
        if job_store.is_cancelled(job_id):
            engine.unload()
            return None

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    if generate_image:
        art_desc = image_caption or text[:100]
        _, img_filename = await asyncio.gather(
            engine.generate(
                prompt=interpretation.suggested_prompt,
                duration=duration,
                output_path=output_path,
            ),
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                art_desc,
            ),
        )
    else:
        await engine.generate(
            prompt=interpretation.suggested_prompt,
            duration=duration,
            output_path=output_path,
        )
        img_filename = None
    engine.unload()

    if job_id:
        job_store.update_step(job_id, step_offset + 2)

    result = {
        "mode": "write",
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


async def _handle_song(text, image_caption, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_write_to_song(text, image_caption, duration=duration, style_prompts=style_prompts)

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

    if generate_image:
        art_desc = image_caption or text[:100]
        _, img_filename = await asyncio.gather(
            engine.generate(
                prompt=interpretation.music_tags,
                duration=song_duration,
                output_path=output_path,
                lyrics=interpretation.lyrics,
                tags=interpretation.music_tags,
            ),
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                art_desc,
            ),
        )
    else:
        await engine.generate(
            prompt=interpretation.music_tags,
            duration=song_duration,
            output_path=output_path,
            lyrics=interpretation.lyrics,
            tags=interpretation.music_tags,
        )
        img_filename = None
    engine.unload()

    if job_id:
        job_store.update_step(job_id, step_offset + 3)

    result = {
        "mode": "write",
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


async def _handle_narration(text, image_caption, engine, engine_name, duration, generate_image=True, style_prompts=None, job_id: str | None = None, step_offset: int = 0):
    if job_id:
        job_store.update_step(job_id, step_offset)
        if job_store.is_cancelled(job_id):
            return None

    interpretation = await interpret_write_to_narration(text, image_caption, duration=duration, style_prompts=style_prompts)

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
        art_desc = image_caption or text[:100]
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                art_desc,
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

    if job_id:
        job_store.update_step(job_id, step_offset + 5)

    result = {
        "mode": "write",
        "output_type": "narration",
        "mood_keywords": interpretation.mood_keywords,
        "summary": interpretation.summary,
        "narration_text": interpretation.narration_text,
        "background_music_prompt": interpretation.background_music_prompt,
        "engine": engine_name,
        "audio_url": f"/audio/{final_filename}",
    }
    if image_task:
        img_filename = await image_task
        result["image_url"] = f"/images/{img_filename}"
    return result
