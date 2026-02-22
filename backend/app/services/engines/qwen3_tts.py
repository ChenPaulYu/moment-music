import asyncio
import platform
from pathlib import Path

import numpy as np

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


def _use_mlx() -> bool:
    """True if on Apple Silicon with mlx-audio available."""
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        return False
    try:
        import mlx  # noqa: F401
        import mlx_audio  # noqa: F401

        return True
    except ImportError:
        return False


USE_MLX = _use_mlx()


class Qwen3TTSEngine(AudioEngine):
    """Qwen3-TTS — narration voice synthesis.

    Uses MLX-native inference on Apple Silicon (4-5x faster) via mlx-audio,
    with automatic fallback to PyTorch on CUDA/CPU platforms.
    """

    name = "Qwen3-TTS"
    engine_type = EngineType.QWEN3_TTS
    requires_gpu = False

    _model = None

    def is_available(self) -> bool:
        if USE_MLX:
            return True
        try:
            import torch  # noqa: F401

            return True
        except ImportError:
            return False

    # -- Model loading --------------------------------------------------------

    def _load_model(self):
        if self._model is not None:
            return self._model
        if USE_MLX:
            self._load_model_mlx()
        else:
            self._load_model_pytorch()
        return self._model

    def _load_model_mlx(self):
        from mlx_audio.tts import load

        self._model = load("mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16")

    def _load_model_pytorch(self):
        import torch
        from qwen_tts import Qwen3TTSModel

        hw_device = get_device()
        device = "cuda" if hw_device == "cuda" else "cpu"

        local_path = MODELS_DIR / "qwen3_tts"
        model_id = str(local_path) if local_path.exists() else "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"

        dtype = torch.bfloat16 if device == "cuda" else torch.float32
        model = Qwen3TTSModel.from_pretrained(
            model_id,
            device_map=device,
            dtype=dtype,
        )

        if device == "cuda" and hasattr(torch, "compile"):
            try:
                model = torch.compile(model)
            except Exception:
                pass

        self._model = model

    # -- Unload ---------------------------------------------------------------

    def unload(self):
        if self._model is not None:
            del self._model
            self._model = None
            if not USE_MLX:
                import gc
                import torch

                gc.collect()
                if torch.backends.mps.is_available():
                    torch.mps.empty_cache()

    # -- Generation -----------------------------------------------------------

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        import soundfile as sf

        language = kwargs.get("language", "English")
        speaker = kwargs.get("speaker", "Ryan")

        if USE_MLX:

            def _run():
                model = self._load_model()
                audio_chunks = []
                sample_rate = 24000
                for result in model.generate(text=prompt):
                    audio_chunks.append(np.array(result.audio))
                    sample_rate = result.sample_rate
                audio = np.concatenate(
                    [np.asarray(c, dtype=np.float32) for c in audio_chunks]
                )
                output_path.parent.mkdir(parents=True, exist_ok=True)
                sf.write(str(output_path), audio, samplerate=sample_rate)

        else:

            def _run():
                model = self._load_model()
                wavs, sr = model.generate_custom_voice(
                    text=prompt, language=language, speaker=speaker
                )
                output_path.parent.mkdir(parents=True, exist_ok=True)
                sf.write(str(output_path), wavs[0], samplerate=sr)

        await asyncio.to_thread(_run)
        return output_path
