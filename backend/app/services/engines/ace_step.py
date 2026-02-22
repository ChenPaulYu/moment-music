import asyncio
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


class AceStepEngine(AudioEngine):
    """ACE-STEP 1.5 — song generation with lyrics (up to 600s, 48kHz).

    Supports CUDA, MPS (Apple Silicon), and CPU.
    """

    name = "ACE-STEP"
    engine_type = EngineType.ACE_STEP
    requires_gpu = False

    _handler = None

    def is_available(self) -> bool:
        try:
            from acestep.acestep_v15_pipeline import AceStepHandler  # noqa: F401

            return True
        except ImportError:
            return False

    def _load_handler(self):
        if self._handler is not None:
            return self._handler

        from acestep.acestep_v15_pipeline import AceStepHandler

        device = get_device()

        self._handler = AceStepHandler()
        # ACE-STEP expects {project_root}/checkpoints/{config_path}/
        # models/checkpoints is a symlink to models/ace_step
        self._handler.initialize_service(
            project_root=str(MODELS_DIR),
            config_path="acestep-v15-turbo",
            device=device,
        )
        return self._handler

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        import soundfile as sf

        lyrics = kwargs.get("lyrics", "")
        tags = kwargs.get("tags", prompt)

        def _run():
            handler = self._load_handler()
            result = handler.generate_music(
                captions=tags,
                lyrics=lyrics,
                audio_duration=duration,
            )
            if not result.get("success"):
                raise RuntimeError(f"ACE-STEP generation failed: {result.get('error')}")

            audio_data = result["audios"][0]
            audio_tensor = audio_data["tensor"]
            sr = audio_data["sample_rate"]

            # tensor shape: (channels, samples) → (samples, channels)
            audio_np = audio_tensor.numpy().T
            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), audio_np, samplerate=sr)

        await asyncio.to_thread(_run)
        return output_path
