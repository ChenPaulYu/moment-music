import asyncio
import tempfile
from pathlib import Path

from app.services.engines.base import AudioEngine, EngineType, MODELS_DIR, get_device


class HeartMuLaEngine(AudioEngine):
    """HeartMuLa — lyrics-conditioned music generation (up to 240s, multilingual).

    Supports CUDA (float16), MPS (float32), and CPU (float32, slower).
    """

    name = "HeartMuLa"
    engine_type = EngineType.HEART_MULA
    requires_gpu = False

    _pipe = None

    def is_available(self) -> bool:
        try:
            import torch  # noqa: F401
            from heartlib import HeartMuLaGenPipeline  # noqa: F401

            return True
        except ImportError:
            return False

    def _load_pipeline(self):
        if self._pipe is not None:
            return self._pipe

        import torch
        from heartlib import HeartMuLaGenPipeline

        device = get_device()
        torch_device = torch.device(device)
        dtype = torch.float16 if device == "cuda" else torch.float32

        model_path = str(MODELS_DIR / "heart_mula")
        self._pipe = HeartMuLaGenPipeline.from_pretrained(
            model_path,
            device={"mula": torch_device, "codec": torch_device},
            dtype={"mula": dtype, "codec": dtype},
            version="3B",
        )
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
