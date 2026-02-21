from pathlib import Path

# Resolve paths relative to the app/ directory
APP_DIR = Path(__file__).resolve().parent.parent


def load_prompt(filename: str) -> str:
    """Load a prompt template from the app/prompts/ directory."""
    path = APP_DIR / "prompts" / filename
    return path.read_text(encoding="utf-8")
