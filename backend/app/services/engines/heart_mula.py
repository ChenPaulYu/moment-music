import asyncio
import logging
import os
import tempfile
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device

logger = logging.getLogger(__name__)


class HeartMuLaEngine(AudioEngine):
    """HeartMuLa — lyrics-conditioned music generation (up to 240s, multilingual).

    Supports CUDA (float16), MPS (float16), and CPU (float32, slower).

    Environment variables for tuning:
        HEARTMULA_DEVICE     — override device ("cuda", "mps", "cpu")
        HEARTMULA_DTYPE      — override dtype ("float16", "bfloat16", "float32")
        HEARTMULA_LAZY_LOAD  — "true" to load components on demand (saves peak VRAM)
        HEARTMULA_VERSION    — model version subfolder (default "3B")
    """

    name = "HeartMuLa"
    engine_type = EngineType.HEART_MULA
    requires_gpu = False

    _pipe = None

    def unload(self):
        if self._pipe is not None:
            import gc
            import torch
            del self._pipe
            self._pipe = None
            gc.collect()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            elif torch.cuda.is_available():
                torch.cuda.empty_cache()

    def is_available(self) -> bool:
        try:
            import torch  # noqa: F401
            from heartlib import HeartMuLaGenPipeline  # noqa: F401

            return True
        except ImportError:
            return False

    def _resolve_dtype(self, device: str):
        import torch

        override = os.getenv("HEARTMULA_DTYPE", "").lower()
        if override:
            return {"float16": torch.float16, "bfloat16": torch.bfloat16, "float32": torch.float32}[override]

        # float16 works on both CUDA and MPS; CPU needs float32
        if device in ("cuda", "mps"):
            return torch.float16
        return torch.float32

    def _load_pipeline(self):
        if self._pipe is not None:
            return self._pipe

        import torch
        from heartlib import HeartMuLaGenPipeline

        device = os.getenv("HEARTMULA_DEVICE", get_device())
        torch_device = torch.device(device)
        dtype = self._resolve_dtype(device)
        lazy_load = os.getenv("HEARTMULA_LAZY_LOAD", "true").lower() == "true"
        version = os.getenv("HEARTMULA_VERSION", "3B")

        model_path = str(MODELS_DIR / "heart_mula")

        logger.info(
            "Loading HeartMuLa: device=%s, dtype=%s, lazy_load=%s, version=%s",
            device, dtype, lazy_load, version,
        )

        self._pipe = HeartMuLaGenPipeline.from_pretrained(
            model_path,
            device={"mula": torch_device, "codec": torch_device},
            dtype={"mula": dtype, "codec": dtype},
            lazy_load=lazy_load,
            version=version,
        )

        # MPS doesn't support torch.autocast — patch _forward to use
        # a no-op autocast context so computation stays on MPS device
        if device == "mps":
            _orig_forward = self._pipe._forward

            def _mps_forward(model_inputs, **kwargs):
                import contextlib
                _real_autocast = torch.autocast
                torch.autocast = lambda *a, **kw: contextlib.nullcontext()
                try:
                    return _orig_forward(model_inputs, **kwargs)
                finally:
                    torch.autocast = _real_autocast

            self._pipe._forward = _mps_forward

        return self._pipe

    async def generate(
        self, prompt: str, duration: float, output_path: Path, **kwargs
    ) -> Path:
        lyrics = kwargs.get("lyrics", "")
        tags = kwargs.get("tags", prompt)
        topk = kwargs.get("topk", 50)
        temperature = kwargs.get("temperature", 1.0)
        cfg_scale = kwargs.get("cfg_scale", 1.5)

        max_audio_length_ms = int(min(duration, 240) * 1000)

        def _run():
            pipe = self._load_pipeline()
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # HeartMuLa expects file paths for lyrics and tags
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False
            ) as lyrics_f:
                lyrics_f.write(lyrics)
                lyrics_path = lyrics_f.name

            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False
            ) as tags_f:
                tags_f.write(tags)
                tags_path = tags_f.name

            pipe(
                {"lyrics": lyrics_path, "tags": tags_path},
                max_audio_length_ms=max_audio_length_ms,
                save_path=str(output_path),
                topk=topk,
                temperature=temperature,
                cfg_scale=cfg_scale,
            )

            # Clean up temp files
            Path(lyrics_path).unlink(missing_ok=True)
            Path(tags_path).unlink(missing_ok=True)

        await asyncio.to_thread(_run)
        return output_path
