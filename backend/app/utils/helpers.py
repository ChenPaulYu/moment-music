import re
from pathlib import Path

# Resolve paths relative to the app/ directory
APP_DIR = Path(__file__).resolve().parent.parent

# Section markers that don't count as sung words
_SECTION_RE = re.compile(r"\[.*?\]")


def load_prompt(filename: str) -> str:
    """Load a prompt template from the app/prompts/ directory."""
    path = APP_DIR / "prompts" / filename
    return path.read_text(encoding="utf-8")


def estimate_song_duration(
    lyrics: str,
    target_duration: float = 30,
    min_duration: float = 30,
    max_duration: float = 600,
) -> float:
    """Estimate song duration from lyrics content, respecting the user's target.

    Assumes ~1.5 sung words/second (typical singing pace, slower than speech).
    Adds 5s padding for intro/outro.
    Caps at 2x the target duration to prevent runaway lengths.
    """
    # Cap max to 2x the target so a 30s request won't produce 180s+
    effective_max = min(max_duration, target_duration * 2)
    cleaned = _SECTION_RE.sub("", lyrics)
    word_count = len(cleaned.split())
    estimated = (word_count / 1.5) + 5
    return max(min_duration, min(estimated, effective_max))


def get_audio_duration(file_path: Path) -> float:
    """Return the duration in seconds of an audio file using soundfile."""
    import soundfile as sf

    info = sf.info(str(file_path))
    return info.duration
