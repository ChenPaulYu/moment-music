import asyncio
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


class Qwen3TTSEngine(AudioEngine):
    """Qwen3-TTS — narration voice synthesis (auto-downloads from HuggingFace).

    Supports CUDA, MPS (Apple Silicon), and CPU.
    """

    name = "Qwen3-TTS"
    engine_type = EngineType.QWEN3_TTS
    requires_gpu = False

    _model = None

    def is_available(self) -> bool:
        try:
            import torch  # noqa: F401

            return True
        except ImportError:
            return False

    def _load_model(self):
        if self._model is not None:
            return self._model

        import torch
        from qwen_tts import Qwen3TTSModel

        device = get_device()
        # Use pre-downloaded checkpoint if available, else download from HF
        local_path = MODELS_DIR / "qwen3_tts"
        model_id = str(local_path) if local_path.exists() else "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"

        dtype = torch.bfloat16 if device == "cuda" else torch.float32
        self._model = Qwen3TTSModel.from_pretrained(
            model_id,
            device_map=device,
            dtype=dtype,
        )
        return self._model

    def unload(self):
        if self._model is not None:
            import gc
            import torch
            del self._model
            self._model = None
            gc.collect()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        import soundfile as sf

        language = kwargs.get("language", "English")
        speaker = kwargs.get("speaker", "Ryan")

        def _run():
            model = self._load_model()
            wavs, sr = model.generate_custom_voice(
                text=prompt, language=language, speaker=speaker
            )
            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), wavs[0], samplerate=sr)

        await asyncio.to_thread(_run)
        return output_path
