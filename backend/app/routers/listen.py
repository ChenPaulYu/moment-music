import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.services.audio_analysis import analyze_audio
from app.services.engines import EngineType, get_engine
from app.services.image_generation import generate_album_art
from app.services.prompt_generation import (
    interpret_listen_to_music_prompt,
    interpret_listen_to_narration,
    interpret_listen_to_song,
)
from app.utils.helpers import estimate_song_duration, get_audio_duration

router = APIRouter()

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"

DEFAULT_ENGINE = os.getenv("DEFAULT_ENGINE", EngineType.ACE_STEP.value)
DEFAULT_DURATION = int(os.getenv("DEFAULT_DURATION", "30"))


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

        if music_sr != voice_sr:
            indices = np.round(np.arange(0, len(music), music_sr / voice_sr)).astype(int)
            indices = indices[indices < len(music)]
            music = music[indices]

        if voice.ndim > 1:
            voice = voice.mean(axis=1)
        if music.ndim > 1:
            music = music.mean(axis=1)

        target_len = max(len(voice), len(music))
        if len(voice) < target_len:
            voice = np.pad(voice, (0, target_len - len(voice)))
        if len(music) < target_len:
            repeats = (target_len // len(music)) + 1
            music = np.tile(music, repeats)[:target_len]
        else:
            music = music[:target_len]

        mixed = voice + music * 0.25
        peak = np.abs(mixed).max()
        if peak > 0.95:
            mixed = mixed * (0.95 / peak)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), mixed, samplerate=voice_sr)

    await asyncio.to_thread(_mix)
    return output_path


@router.post("/listen/generate")
async def generate_listen(
    audio: UploadFile = File(...),
    output_type: str = Form("instrumental"),
    engine: str = Form(DEFAULT_ENGINE),
    duration: int = Form(DEFAULT_DURATION),
    generate_image: str = Form("true"),
    style_prompts: str = Form(""),
):
    try:
        # Validate audio file
        if not audio or not audio.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "Audio recording is required."},
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

        # 1. Analyze captured audio
        audio_bytes = await audio.read()
        mime = audio.content_type or "audio/webm"
        audio_description = await analyze_audio(audio_bytes, mime)

        # Parse style prompts
        parsed_styles = json.loads(style_prompts) if style_prompts else None

        # 2. Branch by output type
        want_image = generate_image.lower() == "true"
        if output_type == "narration":
            return await _handle_narration(audio_description, audio_engine, engine, duration, want_image, parsed_styles)
        elif output_type == "song":
            return await _handle_song(audio_description, audio_engine, engine, duration, want_image, parsed_styles)
        else:
            return await _handle_instrumental(audio_description, audio_engine, engine, duration, want_image, parsed_styles)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


async def _handle_instrumental(audio_description, engine, engine_name, duration, generate_image=True, style_prompts=None):
    interpretation = await interpret_listen_to_music_prompt(audio_description, duration=duration, style_prompts=style_prompts)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    if generate_image:
        _, img_filename = await asyncio.gather(
            engine.generate(
                prompt=interpretation.suggested_prompt,
                duration=duration,
                output_path=output_path,
            ),
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                audio_description[:100],
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

    result = {
        "mode": "listen",
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


async def _handle_song(audio_description, engine, engine_name, duration, generate_image=True, style_prompts=None):
    interpretation = await interpret_listen_to_song(audio_description, duration=duration, style_prompts=style_prompts)

    # Let lyrics drive the duration
    song_duration = estimate_song_duration(interpretation.lyrics, target_duration=duration)

    filename = f"{_uid()}.mp3"
    output_path = AUDIO_DIR / filename

    if generate_image:
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
                audio_description[:100],
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

    result = {
        "mode": "listen",
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


async def _handle_narration(audio_description, engine, engine_name, duration, generate_image=True, style_prompts=None):
    interpretation = await interpret_listen_to_narration(audio_description, duration=duration, style_prompts=style_prompts)

    voice_filename = f"{_uid()}_voice.wav"
    music_filename = f"{_uid()}_bg.mp3"
    voice_path = AUDIO_DIR / voice_filename
    music_path = AUDIO_DIR / music_filename

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

    image_task = None
    if generate_image:
        image_task = asyncio.create_task(
            generate_album_art(
                interpretation.summary,
                interpretation.mood_keywords,
                audio_description[:100],
            )
        )

    # Generate TTS first, then measure its duration for background music
    await tts_engine.generate(
        prompt=interpretation.narration_text,
        duration=0,  # ignored by TTS — duration driven by text
        output_path=voice_path,
    )
    tts_engine.unload()

    # Match background music to actual voice duration
    voice_duration = await asyncio.to_thread(get_audio_duration, voice_path)

    await engine.generate(
        prompt=interpretation.background_music_prompt,
        duration=voice_duration,
        output_path=music_path,
    )
    engine.unload()

    final_filename = f"{_uid()}.mp3"
    final_path = AUDIO_DIR / final_filename
    await _mix_narration_and_music(voice_path, music_path, final_path)

    result = {
        "mode": "listen",
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
