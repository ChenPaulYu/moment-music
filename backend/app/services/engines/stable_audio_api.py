import asyncio
import os
from pathlib import Path

import requests

from app.services.engines.base import AudioEngine, EngineType


class StableAudioAPIEngine(AudioEngine):
    """Stability AI Stable Audio 2 cloud API engine."""

    name = "Stable Audio API"
    engine_type = EngineType.STABLE_AUDIO_API
    requires_gpu = False

    def is_available(self) -> bool:
        return bool(os.getenv("STABILITY_API_KEY"))

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        seed = kwargs.get("seed", 0)
        steps = kwargs.get("steps", 50)
        cfg_scale = kwargs.get("cfg_scale", 7.0)
        output_format = kwargs.get("output_format", "mp3")

        api_key = os.getenv("STABILITY_API_KEY")
        if not api_key:
            raise ValueError("Missing STABILITY_API_KEY environment variable")

        output_path.parent.mkdir(parents=True, exist_ok=True)

        def _call_api() -> bytes:
            response = requests.post(
                "https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Accept": "audio/*",
                },
                files={"image": None},
                data={
                    "prompt": prompt,
                    "duration": int(duration),
                    "seed": seed,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "output_format": output_format,
                },
            )
            if not response.ok:
                raise Exception(
                    f"Stable Audio API error — HTTP {response.status_code}: {response.text}"
                )
            return response.content

        audio_bytes = await asyncio.to_thread(_call_api)
        output_path.write_bytes(audio_bytes)
        return output_path
