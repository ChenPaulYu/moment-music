#!/usr/bin/env python3
"""
Pre-download model checkpoints for Moment Music engines.

Usage:
    uv run python scripts/download_models.py              # interactive selection
    uv run python scripts/download_models.py --all        # download everything
    uv run python scripts/download_models.py stable_audio qwen3_tts  # specific models
    uv run python scripts/download_models.py --list       # list available models

Models are saved to backend/models/<model_name>/
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

MODELS = {
    "stable_audio": {
        "name": "Stable Audio Open 1.0",
        "repo": "stabilityai/stable-audio-open-1.0",
        "method": "huggingface",
        "gated": True,
        "size": "~2.5 GB",
        "note": "Gated model — accept license at HuggingFace first",
    },
    "ace_step": {
        "name": "ACE-STEP 1.5 (main + LM 1.7B)",
        "repo": "ACE-Step/Ace-Step1.5",
        "method": "acestep_cli",
        "gated": False,
        "size": "~4 GB",
        "note": "Uses acestep-download CLI (auto-fallback HF ↔ ModelScope)",
    },
    "qwen3_tts": {
        "name": "Qwen3-TTS 1.7B CustomVoice",
        "repo": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        "method": "huggingface",
        "gated": False,
        "size": "~3.5 GB",
        "note": "",
    },
    "heart_mula": {
        "name": "HeartMuLa 3B + HeartCodec",
        "repo": "HeartMuLa/HeartMuLa-oss-3B-happy-new-year",
        "method": "huggingface",
        "gated": False,
        "size": "~6 GB",
        "extra_repos": ["HeartMuLa/HeartCodec-oss-20260123"],
        "note": "Includes HeartCodec decoder",
    },
}


def print_header(msg: str):
    print(f"\n{'=' * 60}")
    print(f"  {msg}")
    print(f"{'=' * 60}\n")


def list_models():
    print_header("Available Models")
    for i, (key, info) in enumerate(MODELS.items(), 1):
        gated = " [GATED]" if info.get("gated") else ""
        note = f"  ({info['note']})" if info.get("note") else ""
        print(f"  {i}. {key:<16} {info['name']:<40} {info['size']}{gated}")
        if note:
            print(f"     {note}")
    print(f"\n  Download directory: {MODELS_DIR}/")


def interactive_select() -> list[str]:
    """Let user pick which models to download."""
    print_header("Moment Music — Model Checkpoint Downloader")

    keys = list(MODELS.keys())
    for i, key in enumerate(keys, 1):
        info = MODELS[key]
        gated = " [GATED — needs HF_TOKEN]" if info.get("gated") else ""
        dest = MODELS_DIR / key
        installed = " ✓ (already downloaded)" if dest.exists() else ""
        print(f"  [{i}] {info['name']:<40} {info['size']}{gated}{installed}")
        if info.get("note"):
            print(f"      {info['note']}")

    print(f"\n  [A] Download ALL")
    print(f"  [Q] Quit\n")

    while True:
        choice = input("  Select models (comma-separated numbers, A for all, Q to quit): ").strip()

        if choice.upper() == "Q":
            print("  Cancelled.")
            sys.exit(0)

        if choice.upper() == "A":
            return keys

        try:
            indices = [int(x.strip()) for x in choice.split(",")]
            selected = []
            for idx in indices:
                if 1 <= idx <= len(keys):
                    selected.append(keys[idx - 1])
                else:
                    print(f"  Invalid number: {idx}. Choose 1-{len(keys)}.")
                    selected = []
                    break
            if selected:
                return selected
        except ValueError:
            print("  Please enter numbers separated by commas, A, or Q.")


def download_huggingface(key: str, info: dict):
    """Download model from HuggingFace Hub."""
    from huggingface_hub import snapshot_download

    token = os.getenv("HF_TOKEN") if info.get("gated") else None
    if info.get("gated") and not token:
        print(f"  SKIP: {info['name']} — gated model requires HF_TOKEN")
        print(f"    1. Accept license at https://huggingface.co/{info['repo']}")
        print(f"    2. export HF_TOKEN=hf_your_token_here")
        return False

    dest = MODELS_DIR / key
    dest.mkdir(parents=True, exist_ok=True)

    print(f"  Downloading {info['repo']} → {dest}")
    snapshot_download(repo_id=info["repo"], local_dir=str(dest), token=token)
    print(f"  ✓ Main model saved to {dest}")

    # Download extra repos (e.g. HeartCodec)
    for extra_repo in info.get("extra_repos", []):
        extra_name = extra_repo.split("/")[-1]
        extra_dest = dest / extra_name
        extra_dest.mkdir(parents=True, exist_ok=True)
        print(f"  Downloading extra: {extra_repo} → {extra_dest}")
        snapshot_download(repo_id=extra_repo, local_dir=str(extra_dest), token=token)
        print(f"  ✓ Extra saved to {extra_dest}")

    return True


def download_acestep(key: str, info: dict):
    """Download ACE-STEP main model only (includes turbo DiT + 1.7B LM).

    The acestep-download CLI --dir sets the checkpoints directory directly.
    The engine passes project_root=MODELS_DIR to AceStepHandler, which
    internally looks for {project_root}/checkpoints/acestep-v15-turbo/ etc.
    So we pass --dir models/checkpoints/ to match.
    """
    dest = MODELS_DIR / "checkpoints"
    dest.mkdir(parents=True, exist_ok=True)

    print(f"  Using acestep-download CLI → {dest}")
    result = subprocess.run(
        ["uv", "run", "acestep-download", "--dir", str(dest)],
        cwd=str(MODELS_DIR.parent),
    )
    if result.returncode == 0:
        print(f"  ✓ ACE-STEP models saved to {dest}")
        return True
    else:
        print(f"  ✗ acestep-download failed (exit code {result.returncode})")
        return False


def download_model(key: str) -> bool:
    info = MODELS[key]
    dest = MODELS_DIR / key

    print_header(f"Downloading: {info['name']} ({info['size']})")

    if dest.exists() and any(dest.iterdir()):
        print(f"  Directory already exists: {dest}")
        try:
            answer = input("  Re-download? [y/N]: ").strip().lower()
        except EOFError:
            answer = "n"
        if answer != "y":
            print("  Skipping (already downloaded).")
            return True

    method = info["method"]
    if method == "huggingface":
        return download_huggingface(key, info)
    elif method == "acestep_cli":
        return download_acestep(key, info)
    else:
        print(f"  Unknown download method: {method}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Download model checkpoints for Moment Music engines"
    )
    parser.add_argument(
        "models", nargs="*",
        help="Model keys to download (e.g. stable_audio qwen3_tts). Omit for interactive.",
    )
    parser.add_argument("--all", action="store_true", help="Download all models")
    parser.add_argument("--list", action="store_true", help="List available models")
    args = parser.parse_args()

    if args.list:
        list_models()
        return

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if args.all:
        targets = list(MODELS.keys())
    elif args.models:
        # Validate model names
        for key in args.models:
            if key not in MODELS:
                print(f"Unknown model: {key}")
                print(f"Available: {', '.join(MODELS.keys())}")
                sys.exit(1)
        targets = args.models
    else:
        targets = interactive_select()

    print(f"\n  Download directory: {MODELS_DIR}/")
    print(f"  Models to download: {', '.join(targets)}")

    results = {}
    for key in targets:
        results[key] = download_model(key)

    print_header("Summary")
    for key, ok in results.items():
        status = "✓ OK" if ok else "✗ FAILED/SKIPPED"
        print(f"  {key:<16} {status}")

    print(f"\n  Models saved to: {MODELS_DIR}/")


if __name__ == "__main__":
    main()
