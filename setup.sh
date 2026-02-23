#!/usr/bin/env bash
# Moment Music — One-Key Setup
# Run this on a fresh Mac to install everything and get ready to develop.
#
# Usage:
#   bash setup.sh          # full setup (system deps + backend + frontend + models)
#   bash setup.sh --skip-models   # skip model download (faster, download later)
#
# What it does:
#   1. Install system dependencies (Homebrew: uv, node, ffmpeg, sox, git-lfs, cloudflared)
#   2. Install backend Python packages (uv sync)
#   3. Install frontend Node packages (npm install)
#   4. Create .env from template (if missing)
#   5. Download AI model checkpoints (interactive selection)

set -euo pipefail
cd "$(dirname "$0")"

SKIP_MODELS=false
for arg in "$@"; do
    [[ "$arg" == "--skip-models" ]] && SKIP_MODELS=true
done

echo ""
echo "============================================"
echo "  Moment Music — One-Key Setup"
echo "============================================"

# ── 1. System dependencies (macOS) ──────────────────────────────

echo ""
echo "[1/5] System dependencies..."

if [[ "$(uname)" != "Darwin" ]]; then
    echo "  ⚠ Not macOS — skipping Homebrew. Install manually: uv, node, ffmpeg, sox, git-lfs"
else
    if ! command -v brew &>/dev/null; then
        echo "  Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    # uv: Python package manager (never use pip)
    # node: frontend runtime
    # ffmpeg: narration audio mixing
    # sox: Qwen3-TTS audio processing
    # git-lfs: downloading AI model checkpoints
    # tmux: terminal multiplexer for running services
    # cloudflared: HTTPS tunnel for mobile testing
    for pkg in uv node ffmpeg sox git-lfs tmux cloudflared; do
        if brew list "$pkg" &>/dev/null 2>&1 || command -v "$pkg" &>/dev/null; then
            echo "  ✓ $pkg"
        else
            echo "  Installing $pkg..."
            brew install "$pkg"
        fi
    done

    # Ensure git-lfs is initialized
    git lfs install --skip-smudge &>/dev/null 2>&1 || true
fi

# ── 2. Backend Python packages ──────────────────────────────────

echo ""
echo "[2/5] Backend packages (uv sync)..."
(cd backend && uv sync)
echo "  ✓ Python packages installed"

# ── 3. Frontend Node packages ───────────────────────────────────

echo ""
echo "[3/5] Frontend packages (npm install)..."
(cd frontend && npm install)
echo "  ✓ Node packages installed"

# ── 4. Environment file ────────────────────────────────────────

echo ""
echo "[4/5] Environment file..."

if [[ -f backend/.env ]]; then
    echo "  ✓ backend/.env exists"
else
    cp backend/.env.example backend/.env
    echo "  ✓ Created backend/.env from template"
    echo "  ⚠ Fill in your API keys: backend/.env"
fi

# ── 5. AI model checkpoints ────────────────────────────────────

echo ""
if [[ "$SKIP_MODELS" == true ]]; then
    echo "[5/5] Skipping model download (--skip-models)"
    echo "  Download later: cd backend && uv run python scripts/download_models.py"
else
    echo "[5/5] AI model checkpoints..."
    (cd backend && uv run python scripts/download_models.py)
fi

# ── Done ────────────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Start the app:"
echo "    ./dev.sh"
echo ""
echo "  Or separately:"
echo "    ./run-backend.sh     # http://localhost:8000"
echo "    ./run-frontend.sh    # http://localhost:5173"
echo "============================================"
