import base64

from openai import AsyncOpenAI

from app.utils.helpers import load_prompt

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    return _client


async def caption_image(image_bytes: bytes, mime_type: str) -> str:
    """Generate an objective caption of the uploaded image using GPT-5.2 vision."""
    system_prompt = load_prompt("write_caption_system.md")
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_uri = f"data:{mime_type};base64,{b64}"

    response = await _get_client().chat.completions.create(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image."},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
        max_completion_tokens=300,
    )
    return response.choices[0].message.content.strip()
