import base64
import io
import os

from openai import AsyncOpenAI
from pydub import AudioSegment

from app.utils.helpers import load_prompt

_client = None

AUDIO_ANALYSIS_MODEL = os.getenv("AUDIO_ANALYSIS_MODEL", "gpt-audio")


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    return _client


async def analyze_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Analyze captured ambient audio using gpt-audio and return a description."""
    # Convert to WAV (gpt-audio only accepts WAV/MP3)
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    wav_buffer = io.BytesIO()
    audio.export(wav_buffer, format="wav")
    wav_bytes = wav_buffer.getvalue()

    b64_audio = base64.b64encode(wav_bytes).decode("utf-8")
    system_prompt = load_prompt("listen_analysis_system.md")

    response = await _get_client().chat.completions.create(
        model=AUDIO_ANALYSIS_MODEL,
        modalities=["text"],
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe what you hear in this recording."},
                    {"type": "input_audio", "input_audio": {"data": b64_audio, "format": "wav"}},
                ],
            },
        ],
    )
    return response.choices[0].message.content.strip()
