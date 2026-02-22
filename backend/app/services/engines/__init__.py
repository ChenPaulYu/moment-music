from app.services.engines.base import AudioEngine, EngineType

_engine_cache: dict[EngineType, AudioEngine] = {}

# Map engine type → module path and class name (lazy imports)
_ENGINE_REGISTRY: dict[EngineType, tuple[str, str]] = {
    EngineType.STABLE_AUDIO_API: (
        "app.services.engines.stable_audio_api",
        "StableAudioAPIEngine",
    ),
    EngineType.STABLE_AUDIO_OPEN: (
        "app.services.engines.stable_audio_open",
        "StableAudioOpenEngine",
    ),
    EngineType.ACE_STEP: (
        "app.services.engines.ace_step",
        "AceStepEngine",
    ),
    EngineType.QWEN3_TTS: (
        "app.services.engines.qwen3_tts",
        "Qwen3TTSEngine",
    ),
    EngineType.HEART_MULA: (
        "app.services.engines.heart_mula",
        "HeartMuLaEngine",
    ),
}


def get_engine(engine_type: EngineType | str) -> AudioEngine:
    """Get an engine instance by type. Uses lazy imports and caching."""
    if isinstance(engine_type, str):
        engine_type = EngineType(engine_type)

    if engine_type in _engine_cache:
        return _engine_cache[engine_type]

    if engine_type not in _ENGINE_REGISTRY:
        raise ValueError(f"Unknown engine type: {engine_type}")

    module_path, class_name = _ENGINE_REGISTRY[engine_type]

    import importlib

    module = importlib.import_module(module_path)
    engine_class = getattr(module, class_name)
    instance = engine_class()
    _engine_cache[engine_type] = instance
    return instance


def list_available_engines() -> list[dict]:
    """List all engines with their availability status."""
    results = []
    for engine_type in EngineType:
        try:
            engine = get_engine(engine_type)
            results.append(engine.info())
        except Exception:
            # Engine module failed to import — report as unavailable
            results.append(
                {
                    "engine": engine_type.value,
                    "name": engine_type.value,
                    "available": False,
                    "requires_gpu": True,
                }
            )
    return results
