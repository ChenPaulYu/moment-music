import asyncio
import os
import platform
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


def _use_mlx() -> bool:
    """True if on Apple Silicon with mlx + mlx-lm available."""
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        return False
    try:
        import mlx  # noqa: F401
        import mlx_lm  # noqa: F401

        return True
    except ImportError:
        return False


USE_MLX = _use_mlx()
ACE_STEP_THINKING = os.getenv("ACE_STEP_THINKING", "false").lower() in ("true", "1", "yes")


class AceStepEngine(AudioEngine):
    """ACE-STEP 1.5 — song generation with lyrics (up to 600s, 48kHz).

    Supports CUDA, MPS (Apple Silicon), and CPU.
    Optionally loads the 5Hz LM (1.7B Qwen3) for chain-of-thought reasoning
    and audio code generation before diffusion, using MLX on Apple Silicon
    or PyTorch elsewhere.
    """

    name = "ACE-STEP"
    engine_type = EngineType.ACE_STEP
    requires_gpu = False

    _handler = None
    _llm = None

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

        # Phase 1: DiT handler (diffusion)
        self._handler = AceStepHandler()
        self._handler.initialize_service(
            project_root=str(MODELS_DIR),
            config_path="acestep-v15-turbo",
            device=device,
            use_mlx_dit=False,
        )

        # Phase 2: LLM handler (optional, for chain-of-thought + audio codes)
        self._load_llm(device)

        return self._handler

    def _load_llm(self, device: str):
        """Load the 5Hz LM for pre-diffusion reasoning. Non-fatal on failure."""
        lm_path = MODELS_DIR / "checkpoints" / "acestep-5Hz-lm-1.7B"
        if not lm_path.exists():
            return

        try:
            from acestep.llm_inference import LLMHandler

            backend = "mlx" if USE_MLX else "pt"
            llm = LLMHandler()
            status, success = llm.initialize(
                checkpoint_dir=str(MODELS_DIR / "checkpoints"),
                lm_model_path="acestep-5Hz-lm-1.7B",
                backend=backend,
                device=device,
            )
            if success:
                self._llm = llm
        except Exception:
            self._llm = None

    def unload(self):
        import gc
        import torch

        if self._llm is not None:
            del self._llm
            self._llm = None

        if self._handler is not None:
            del self._handler
            self._handler = None

        gc.collect()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        import gc
        import soundfile as sf
        import torch
        from acestep.inference import (
            generate_music as ace_generate,
            GenerationParams,
            GenerationConfig,
        )

        lyrics = kwargs.get("lyrics", "")
        tags = kwargs.get("tags", prompt)
        inference_steps = kwargs.get("inference_steps", 8)
        use_thinking = kwargs.get("thinking", ACE_STEP_THINKING)

        def _run():
            if torch.backends.mps.is_available():
                gc.collect()
                torch.mps.empty_cache()

            handler = self._load_handler()

            llm_ready = self._llm is not None and self._llm.llm_initialized
            thinking = use_thinking and llm_ready

            params = GenerationParams(
                caption=tags,
                lyrics=lyrics,
                duration=duration,
                inference_steps=inference_steps,
                thinking=thinking,
            )
            config = GenerationConfig(batch_size=1, audio_format="wav")

            result = ace_generate(
                dit_handler=handler,
                llm_handler=self._llm,
                params=params,
                config=config,
            )

            if not result.success:
                raise RuntimeError(
                    f"ACE-STEP generation failed: {result.error}"
                )

            audio_data = result.audios[0]
            audio_tensor = audio_data["tensor"].cpu()
            sr = audio_data["sample_rate"]

            # tensor shape: (channels, samples) → (samples, channels)
            audio_np = audio_tensor.numpy().T
            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), audio_np, samplerate=sr)

            del result
            gc.collect()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()

        await asyncio.to_thread(_run)
        return output_path
