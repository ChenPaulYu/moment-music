from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path


MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models"


class EngineType(str, Enum):
    STABLE_AUDIO_API = "stable_audio_api"
    STABLE_AUDIO_OPEN = "stable_audio_open"
    ACE_STEP = "ace_step"
    QWEN3_TTS = "qwen3_tts"
    HEART_MULA = "heart_mula"


def get_device() -> str:
    """Detect best available device: cuda (NVIDIA) > mps (Apple Silicon) > cpu."""
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def has_gpu() -> bool:
    """Return True if any GPU backend (CUDA or MPS) is available."""
    return get_device() in ("cuda", "mps")


class AudioEngine(ABC):
    """Base class for all audio generation engines."""

    name: str
    engine_type: EngineType
    requires_gpu: bool = False

    @abstractmethod
    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        """Generate audio and save to output_path. Returns the path."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check whether this engine can run in the current environment."""
        ...

    def unload(self):
        """Release model from memory. Override in subclasses to clear cached models."""
        pass

    def info(self) -> dict:
        return {
            "engine": self.engine_type.value,
            "name": self.name,
            "available": self.is_available(),
            "requires_gpu": self.requires_gpu,
            "device": get_device() if self.is_available() else None,
        }
