import os
from pathlib import Path

import requests

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "audio"


def text2audio(
    prompt: str,
    duration: int = 20,
    filename: str = "generated_music.mp3",
    seed: int = 0,
    steps: int = 50,
    cfg_scale: float = 7.0,
    output_format: str = "mp3",
) -> str:
    """
    Generate audio from a text prompt using Stability AI's Stable Audio 2 API.

    Returns:
        Path to the saved audio file.
    """
    api_key = os.getenv("STABILITY_API_KEY")
    if not api_key:
        raise ValueError("Missing STABILITY_API_KEY environment variable")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    filepath = AUDIO_DIR / filename

    response = requests.post(
        "https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "audio/*",
        },
        files={"image": None},
        data={
            "prompt": prompt,
            "duration": duration,
            "seed": seed,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "output_format": output_format,
        },
    )

    if not response.ok:
        raise Exception(f"Stable Audio API error — HTTP {response.status_code}: {response.text}")

    filepath.write_bytes(response.content)
    return str(filepath)
