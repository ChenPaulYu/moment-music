import base64
from pathlib import Path
from uuid import uuid4

from openai import AsyncOpenAI

_client = None

IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "images"


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    return _client


async def generate_album_art(
    summary: str, mood_keywords: list[str], weather_desc: str
) -> str:
    """Generate album art via OpenAI gpt-image-1. Returns the filename."""
    mood_str = ", ".join(mood_keywords)
    prompt = (
        f"Abstract album cover art. {summary}. "
        f"Mood: {mood_str}. Weather: {weather_desc}. "
        f"Atmospheric, cinematic, no text, no letters."
    )

    response = await _get_client().images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1024x1024",
        n=1,
    )

    # Decode base64 image data and save to disk
    image_data = base64.b64decode(response.data[0].b64_json)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex[:12]}.png"
    (IMAGES_DIR / filename).write_bytes(image_data)

    return filename
