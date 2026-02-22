#!/usr/bin/env bash
# Moment Music Backend — Full Setup Script
# Run this on a fresh machine to install all dependencies and sync packages.
#
# Usage:
#   cd backend
#   bash scripts/setup.sh

set -euo pipefail

echo "============================================"
echo "  Moment Music Backend — Setup"
echo "============================================"

# --- System-level dependencies (macOS via Homebrew) ---
if [[ "$(uname)" == "Darwin" ]]; then
    echo ""
    echo "[1/4] Installing system dependencies (Homebrew)..."

    if ! command -v brew &>/dev/null; then
        echo "  ERROR: Homebrew not found. Install from https://brew.sh"
        exit 1
    fi

    # sox: required by qwen-tts for audio processing
    # ffmpeg: general audio/video processing
    for pkg in sox ffmpeg; do
        if brew list "$pkg" &>/dev/null; then
            echo "  ✓ $pkg already installed"
        else
            echo "  Installing $pkg..."
            brew install "$pkg"
        fi
    done
else
    echo ""
    echo "[1/4] Installing system dependencies (apt)..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq sox libsox-dev ffmpeg
fi

# --- uv (Python package manager) ---
echo ""
echo "[2/4] Checking uv..."

if ! command -v uv &>/dev/null; then
    echo "  Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "  ✓ uv installed"
else
    echo "  ✓ uv already installed ($(uv --version))"
fi

# --- Python packages ---
echo ""
echo "[3/4] Installing Python packages (uv sync)..."
uv sync
echo "  ✓ All Python packages installed"

# --- .env file ---
echo ""
echo "[4/4] Checking .env file..."

if [[ -f .env ]]; then
    echo "  ✓ .env file exists"
else
    echo "  Creating .env from template..."
    cat > .env << 'ENVEOF'
# Moment Music Backend Environment Variables
# Copy this file and fill in your API keys

# OpenAI (required for prompt generation)
OPENAI_API_KEY=

# HuggingFace (required for gated models like Stable Audio Open)
HF_TOKEN=

# Stability AI (optional, for Stable Audio API cloud engine)
STABILITY_API_KEY=
ENVEOF
    echo "  ⚠ Created .env — please fill in your API keys"
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Fill in API keys in .env"
echo "    2. Download model checkpoints:"
echo "       uv run python scripts/download_models.py"
echo "    3. Start the server:"
echo "       uv run uvicorn app.main:app --reload --port 8000"
echo "============================================"
