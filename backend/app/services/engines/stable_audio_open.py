import asyncio
import os
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


class StableAudioOpenEngine(AudioEngine):
    """Stable Audio Open 1.0 — local diffusion model (max 47s, 44.1kHz stereo).

    Supports CUDA (float16), MPS (float32), and CPU (float32, slower).
    """

    name = "Stable Audio Open"
    engine_type = EngineType.STABLE_AUDIO_OPEN
    requires_gpu = False

    _pipe = None

    def is_available(self) -> bool:
        try:
            import torch  # noqa: F401
            from diffusers import StableAudioPipeline  # noqa: F401

            return bool(os.getenv("HF_TOKEN"))
        except ImportError:
            return False

    def _load_pipeline(self):
        if self._pipe is not None:
            return self._pipe

        import torch
        from diffusers import StableAudioPipeline

        device = get_device()
        dtype = torch.float16 if device == "cuda" else torch.float32

        # Use pre-downloaded checkpoint if available, else download from HF
        local_path = MODELS_DIR / "stable_audio"
        model_id = str(local_path) if local_path.exists() else "stabilityai/stable-audio-open-1.0"

        self._pipe = StableAudioPipeline.from_pretrained(
            model_id,
            token=os.getenv("HF_TOKEN"),
            torch_dtype=dtype,
        )
        self._pipe = self._pipe.to(device)
        return self._pipe

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        import soundfile as sf

        device = get_device()
        duration = min(duration, 47.0)  # model max is 47s
        # Fewer steps on MPS/CPU for practical speed
        default_steps = 200 if device == "cuda" else 50
        steps = kwargs.get("steps", default_steps)
        negative_prompt = kwargs.get("negative_prompt", "low quality")

        def _run():
            pipe = self._load_pipeline()
            result = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                audio_end_in_s=duration,
                num_inference_steps=steps,
            )
            audio = result.audios[0].T  # (channels, samples) → (samples, channels)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), audio, samplerate=44100)

        await asyncio.to_thread(_run)
        return output_path
