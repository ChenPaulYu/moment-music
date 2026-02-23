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

### Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 18+** with npm
- **OpenAI API key** (required for mood interpretation and album art)
- **FFmpeg** (required for narration audio mixing)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/moment-music.git
   cd moment-music
   ```

2. **Install dependencies:**
   ```bash
   cd backend && uv sync && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Download AI models:**

   Local music engines require model checkpoints in `backend/models/`. Download at least ACE-STEP (the default engine):

   ```bash
   # ACE-STEP (default engine, ~4GB) — required
   cd backend/models
   git lfs install
   git clone https://huggingface.co/ACE-Step/Ace-Step1.5 ace_step
   # Create symlink expected by ACE-STEP loader
   ln -s ace_step checkpoints
   ```

   Optional engines:

   ```bash
   # HeartMuLa (lyrics-conditioned, ~6GB, needs 36GB+ VRAM to run)
   git clone https://huggingface.co/HeartMuLa/HeartMuLaGen heart_mula

   # Stable Audio Open (~4GB, needs HF_TOKEN)
   git clone https://huggingface.co/stabilityai/stable-audio-open-1.0 stable_audio

   # Qwen3-TTS (narration voice, ~4GB) — required for Narration output
   git clone https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice qwen3_tts
   ```

   > Models are gitignored. Each engine checks availability at startup — missing models simply make that engine unavailable.

4. **Configure API keys:**

   Create `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

   Optional keys (for additional engines):
   ```env
   STABILITY_API_KEY=sk-...    # Stable Audio API (Cloud)
   HF_TOKEN=hf_...             # Stable Audio Open (HuggingFace)
   ```

   API keys can also be configured in the browser at `/setup`.

5. **Start the app:**
   ```bash
   ./dev.sh
   ```

   Or run frontend and backend separately:
   ```bash
   ./run-backend.sh     # http://localhost:8000
   ./run-frontend.sh    # http://localhost:5173
   ```

6. **Open** http://localhost:5173

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
