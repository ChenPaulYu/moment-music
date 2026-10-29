from pydantic import BaseModel

from app.services import claude
from app.utils.helpers import load_prompt


class ImageCaption(BaseModel):
    caption: str


async def caption_image(image_bytes: bytes, mime_type: str) -> str:
    """Generate an objective caption of the uploaded image using Claude vision."""
    system_prompt = load_prompt("write_caption_system.md")
    user_content = [claude.image_block(image_bytes), {"type": "text", "text": "Describe this image."}]

    result = await claude.parse(system_prompt, user_content, ImageCaption, effort="low")
    return result.caption.strip()
