# Moment Music

**Every moment has a sound.** Moment Music is an AI-powered generative music platform that transforms real-world moments into unique soundscapes. Capture a moment through writing, listening, movement, or environmental context — and AI interprets the emotional atmosphere to generate personalized audio.

## Four Creation Modes

| Mode | Input | What It Captures |
|------|-------|-----------------|
| **Write** | Text journal + image/camera | Inner thoughts, visual context |
| **Listen** | Microphone ambient capture | Sonic environment |
| **Move** | Device motion sensors | Physical rhythm, energy |
| **Be** | Location text → weather + time | Environmental atmosphere |

## Three Output Types

- **Instrumental** — Pure AI-generated music
- **Song** — Vocals + lyrics over music
- **Narration** — Spoken word over ambient soundtrack

## Quick Start

### Prerequisites (Fresh Mac Setup)

Install system-level dependencies via [Homebrew](https://brew.sh):

```bash
# Package manager for Python — never use pip
brew install uv

# Node.js runtime for the frontend
brew install node

# Audio processing (ffmpeg for narration mixing, sox for Qwen3-TTS)
brew install ffmpeg sox

# Git Large File Storage (required for downloading AI models)
brew install git-lfs && git lfs install

# HTTPS tunnel for mobile testing (optional — needed for Move/Listen modes on phone)
brew install cloudflared
```

You also need an **OpenAI API key** for mood interpretation and album art generation.

### One-Key Setup

Clone and run the setup script — it installs everything (system deps, packages, .env, models):

```bash
git clone https://github.com/ChenPaulYu/moment-music.git
cd moment-music
bash setup.sh
```

Then fill in your OpenAI API key in `backend/.env` and start the app:

```bash
./dev.sh               # opens http://localhost:5173
```

> Use `bash setup.sh --skip-models` to skip the model download and do it later.

### Manual Setup

<details>
<summary>Step-by-step if you prefer manual control</summary>

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ChenPaulYu/moment-music.git
   cd moment-music
   ```

2. **Install dependencies:**
   ```bash
   cd backend && uv sync && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Download AI models:**

   ```bash
   cd backend
   uv run python scripts/download_models.py              # interactive selection
   uv run python scripts/download_models.py ace_step     # just the default engine
   uv run python scripts/download_models.py --all        # download everything
   ```

   Available models: `ace_step` (~4GB, default, includes 5Hz LM), `qwen3_tts` (~3.5GB, narration voice), `heart_mula` (~6GB, needs 36GB+ VRAM), `stable_audio` (~2.5GB, gated, needs HF_TOKEN).

4. **Configure API keys:**

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and fill in your OPENAI_API_KEY
   ```

   API keys can also be configured in the browser at `/setup`.

5. **Start the app:**
   ```bash
   ./dev.sh                 # both frontend + backend
   ./run-backend.sh         # http://localhost:8000
   ./run-frontend.sh        # http://localhost:5173
   ```

6. **Open** http://localhost:5173

</details>

## Mobile Testing with Cloudflare Tunnel

Move mode requires real device motion sensors, and Listen mode needs a microphone — so testing on a physical phone is essential. Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose your local dev server over HTTPS (required for `DeviceMotionEvent` and `getUserMedia`).

1. **Install cloudflared:**
   ```bash
   brew install cloudflared        # macOS
   # or see https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   ```

2. **Start the app** (backend binds to `0.0.0.0`):
   ```bash
   ./dev.sh
   ```

3. **Open a tunnel** (in a separate terminal):
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```

   This prints a public URL like `https://abc-xyz.trycloudflare.com`. Open it on your phone.

Only one tunnel is needed — Vite's dev proxy forwards `/api`, `/audio`, and `/images` requests to the backend automatically. Vite is already configured to accept `.trycloudflare.com` hosts (see `vite.config.ts`).

## Architecture

```
moment-music/
├── frontend/     React + TypeScript + Vite + Tailwind
├── backend/      FastAPI + Python (uv)
└── docs/         Design & architecture documentation
```

**Frontend** serves the UI at `http://localhost:5173` with Vite's dev proxy forwarding `/api` requests to the backend.

**Backend** runs the FastAPI server at `http://localhost:8000`, handling AI processing, job queue management, and audio serving.

## Music Engines

Multiple AI engines are supported. Users choose per output type in the Setup page (`/setup`).

| Engine | Type | Hardware | Best For |
|--------|------|----------|----------|
| **ACE-STEP** (default) | Local | MPS / CUDA / CPU | General-purpose, works on Apple Silicon |
| **HeartMuLa** | Local | CUDA / MPS (36GB+) | Lyrics-conditioned music generation |
| **Stable Audio Open** | Local | MPS / CUDA / CPU | Diffusion-based instrumental |
| **Stable Audio API** | Cloud | None | No local GPU needed |
| **Qwen3-TTS** | Local | MPS / CUDA / CPU | Narration voice synthesis |

## Job Queue

All generation runs through an async job queue:
- Max 1 concurrent job (GPU-bound)
- Max 3 queued jobs (returns HTTP 503 when full)
- Real-time step progress in the UI
- Jobs can be cancelled mid-generation

## Style Prompts

Users can customize AI generation style at `/prompts`:
- 5 configurable prompt keys (lyrics style, narration style, music style, etc.)
- Global defaults with per-mode overrides (Write, Listen, Move, Be)
- Persisted in localStorage

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | GPT-5.2 for mood interpretation + album art |
| `STABILITY_API_KEY` | No | Stable Audio API (cloud engine) |
| `HF_TOKEN` | No | Stable Audio Open (HuggingFace model) |
| `DEFAULT_ENGINE` | No | Default engine (`ace_step`) |
| `DEFAULT_DURATION` | No | Default audio duration in seconds (`30`) |
| `HEARTMULA_DEVICE` | No | Override device for HeartMuLa |
| `HEARTMULA_DTYPE` | No | Override dtype for HeartMuLa |
| `HEARTMULA_LAZY_LOAD` | No | Lazy-load HeartMuLa components (`true`) |
| `ACE_STEP_THINKING` | No | Enable LLM chain-of-thought before diffusion (`false`) |

## Development

**Always use `uv` for Python packages, never `pip`:**
```bash
cd backend
uv add <package>       # add dependency
uv sync                # install all
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Type checking:**
```bash
cd frontend && npx tsc --noEmit
```

## Documentation

| Document | Focus |
|----------|-------|
| [Overview](docs/overview.md) | Research origins, vision, concept |
| [Architecture](docs/architecture.md) | Technical architecture, data flow, API design |
| [Creation Modes](docs/creation-modes.md) | Detailed specs for all four modes |
| [Design Guide](docs/design-guide.md) | Visual design system, colors, typography |
| [AI Pipeline](docs/ai-pipeline.md) | AI services, engines, prompt generation |
| [Async Pipeline](docs/async-pipeline.md) | Job queue, concurrency, polling, error handling |
| [CLAUDE.md](CLAUDE.md) | Developer guide for Claude Code |

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v3.4, React Router v6
- **Backend:** FastAPI, Python 3.12+, uv, OpenAI SDK, PyTorch
- **AI:** GPT-5.2 (vision/reasoning/image gen), ACE-STEP, HeartMuLa, Stable Audio, Qwen3-TTS
- **APIs:** Open-Meteo (weather), Nominatim (geocoding) — both free, no keys needed
- **Design:** Dark mode, glass morphism, Space Grotesk, Material Symbols icons
