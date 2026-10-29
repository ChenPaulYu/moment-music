import base64
import io
import os
from typing import TypeVar

import anthropic
from PIL import Image, ImageOps
from pydantic import BaseModel

MODEL = "claude-opus-5-5"

# Claude downscales anything larger on its long edge, so resizing first only saves upload size.
_MAX_IMAGE_EDGE = 1568

T = TypeVar("T", bound=BaseModel)

_client = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    # Rebuild when the key changes, e.g. after it is saved from the Setup page.
    if _client is None or _client.api_key != os.environ.get("ANTHROPIC_API_KEY"):
        _client = anthropic.AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


def image_block(image_bytes: bytes) -> dict:
    """Build an image content block, re-encoded as JPEG at the size Claude actually reads."""
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
    img.thumbnail((_MAX_IMAGE_EDGE, _MAX_IMAGE_EDGE))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=90)
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": base64.standard_b64encode(buf.getvalue()).decode("utf-8"),
        },
    }


async def parse(system_prompt: str, user_content: str | list, output_model: type[T], effort: str | None = None) -> T:
    """Run one structured-output request and return the validated model."""
    # Opus 5.5 always thinks; effort sets how much. low = fastest, medium = model default, high = most considered.
    effort = effort or os.getenv("LLM_EFFORT", "medium")
    response = await _get_client().beta.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
        output_format=output_model,
        output_config={"effort": effort},
        # If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude declined to interpret this moment. Try rewording it.")
    return response.parsed_output
