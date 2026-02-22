# CLAUDE.md

Guide for Claude Code when working with Moment Music.

## What is Moment Music?

**Moment Music** is an AI-powered generative music platform that transforms real-world moments into unique soundscapes. Users capture moments through multiple modalities — writing, listening, movement, and environmental context — and AI interprets the emotional atmosphere to generate personalized audio.

**Core Philosophy:** Every moment has a sound. Moment Music bridges the gap between lived experience and musical expression through multimodal AI.

See `docs/overview.md` for full vision and architecture.

---

## Four Creation Modes

1. **Write** - Text journal + image upload → mood interpretation → music
2. **Listen** - Ambient sound capture → audio analysis → music (with audio preview before generating)
3. **Move** - Device motion capture → movement patterns → music
4. **Be** - Environmental context (location, weather, time) → atmosphere → music

Each mode captures a different dimension of a moment. Modes can be used independently.

See `docs/creation-modes.md` for detailed mode specifications.

---

## Architecture Overview

**Monorepo Structure:**
```
moment-music/
├── frontend/          (React + TypeScript + Vite + Tailwind)
├── backend/           (FastAPI + Python)
│   ├── app/routers/   (generate, write, listen, move)
│   ├── app/services/  (engines, jobs, prompts, weather, vision, etc.)
│   ├── app/prompts/   (LLM prompt templates as .md files)
│   ├── app/utils/     (audio mixing, helpers)
│   ├── audio/         (generated audio, gitignored)
│   └── models/        (AI model checkpoints, gitignored)
├── docs/              (Design & architecture docs)
└── refs/              (Reference materials, gitignored)
```

**Frontend:** React + TypeScript + Vite on `http://localhost:5173`
**Backend:** FastAPI + Python (uv) on `http://localhost:8000`

See `docs/architecture.md` for technical details.

---

## Music Engines

The backend supports multiple music generation engines. Users choose per output type in the Setup page.

| Engine | Type | Hardware | Output Types |
|--------|------|----------|-------------|
| **ACE-STEP** (default) | Local | MPS / CUDA / CPU | Instrumental, Song, Narration BG |
| **HeartMuLa** | Local | CUDA / MPS (36GB+) | Song (lyrics-conditioned) |
| **Stable Audio Open** | Local | MPS / CUDA / CPU | Instrumental |
| **Stable Audio API** | Cloud | None (API call) | Instrumental |
| **Qwen3-TTS** | Local | MPS / CUDA / CPU | Narration voice |

Engine selection is per-output-type and persisted in localStorage. The backend validates engine availability before accepting jobs.

**HeartMuLa env vars** (for hardware migration):
```bash
HEARTMULA_DEVICE=cuda          # auto-detected if not set
HEARTMULA_DTYPE=float16        # float16 for GPU, float32 for CPU
HEARTMULA_LAZY_LOAD=true       # true saves peak VRAM
HEARTMULA_VERSION=3B           # model version subfolder
```

---

## AI Services

| Service | Purpose | Used In |
|---------|---------|---------|
| OpenAI GPT-5.2 | Image captioning, mood interpretation, prompt generation | All modes |
| ACE-STEP | Instrumental + vocal music generation | All output types |
| HeartMuLa | Lyrics-conditioned music (3B model) | Song output (needs 36GB+ VRAM) |
| Stable Audio Open | Diffusion-based instrumental generation | Instrumental output |
| Stable Audio API (Cloud) | Cloud-based generation via Stability AI | Instrumental output |
| Qwen3-TTS | Narration voice synthesis (local, open-source) | Narration output |
| Open-Meteo | Weather data (free, no API key) | Be mode |
| Nominatim (OSM) | Reverse geocoding (free, no API key) | Be mode |

---

## Job Queue System

All generation requests go through an async job queue (`app/services/jobs.py`):
- **Max concurrent:** 1 job at a time (GPU-bound)
- **Max queue:** 3 active jobs; returns HTTP 503 when full
- **Polling:** Frontend polls `GET /api/jobs/{id}` every 2 seconds
- **Cancellation:** Jobs can be cancelled mid-generation
- **Resume:** Active job persisted in localStorage; resumes on page reload

---

## Style Prompts

Users customize AI generation style via the Prompts page (`/prompts`):
- **5 prompt keys:** lyrics_style, narration_style, bg_music_style, music_prompt_style, overall_mood
- **Global prompts:** Apply to all modes by default
- **Mode overrides:** Per-mode overrides (Write, Listen, Move, Be) with fallback to global
- **Resolution order:** Mode override → Global prompt → Built-in default
- **Storage:** localStorage keys `moment-style-prompts` (global) and `moment-style-prompts-{mode}`

---

## Development Setup

**1. Install dependencies:**
```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

**2. Download AI models** into `backend/models/` (gitignored):
```bash
cd backend/models
git lfs install

# ACE-STEP (default engine) — required
git clone https://huggingface.co/ACE-Step/Ace-Step1.5 ace_step
ln -s ace_step checkpoints    # symlink expected by ACE-STEP loader

# Qwen3-TTS (narration voice) — required for Narration output
git clone https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice qwen3_tts

# HeartMuLa (lyrics-conditioned, needs 36GB+ VRAM) — optional
git clone https://huggingface.co/HeartMuLa/HeartMuLaGen heart_mula

# Stable Audio Open (needs HF_TOKEN) — optional
git clone https://huggingface.co/stabilityai/stable-audio-open-1.0 stable_audio
```

Each engine checks model availability at startup. Missing models make that engine unavailable (not an error).

**3. Configure API keys** — create `backend/.env` (see Environment Variables below).

**4. Run the app:**
```bash
./dev.sh               # both frontend + backend
./run-backend.sh       # backend only
./run-frontend.sh      # frontend only
```

---

## Environment Variables

Create `backend/.env` with:
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional — engine-specific
STABILITY_API_KEY=sk-...    # for Stable Audio API (Cloud)
HF_TOKEN=hf_...             # for Stable Audio Open (HuggingFace)

# Optional — HeartMuLa tuning
HEARTMULA_DEVICE=            # auto-detected
HEARTMULA_DTYPE=float16
HEARTMULA_LAZY_LOAD=true
HEARTMULA_VERSION=3B

# Optional — defaults
DEFAULT_ENGINE=ace_step
DEFAULT_DURATION=30
DEFAULT_OUTPUT_TYPE=instrumental
```

API keys can also be set from the Setup page (`/setup`) in the browser.

---

## Tooling Rules

- **Python packages:** Always use `uv add` to add packages, `uv sync` to install. Never use `pip install`.
- **Environment variables:** Use `python-dotenv` to load from `backend/.env`. Never hardcode secrets.
- **E2E testing:** Use `agent-browser` CLI for browser testing.

---

## Git Conventions

- **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- **Branching:** Feature branches off `main`. Merge via PR.
- **Commit often** — Small, focused commits preferred.

---

## Design Language

- Dark-mode-first, glass morphism aesthetic
- Primary color: `#3713ec` (vivid indigo)
- Font: Space Grotesk (display), system sans-serif (body)
- Tailwind CSS v3.4, custom glass classes in `index.css`
- Material Symbols icons via Google Fonts CDN
- Animated gradients, visualizers, ambient UI

See `docs/design-guide.md` for visual design system.

---

## Key Constraints

- **Mode independence** — Each creation mode works standalone
- **Output flexibility** — Three output types: Instrumental, Song, Narration
- **Async pipeline** — Job queue with progress steps; UI shows real-time status
- **Queue limits** — Max 3 active jobs; HTTP 503 when full
- **API keys external** — All secrets in `.env` or set via Setup page
- **Audio ephemeral** — Generated audio in `backend/audio/`, gitignored
- **Models external** — Checkpoints in `backend/models/`, gitignored

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/generate` | Be mode generation |
| POST | `/api/write/generate` | Write mode generation (multipart) |
| POST | `/api/listen/generate` | Listen mode generation (multipart) |
| POST | `/api/move/generate` | Move mode generation |
| GET | `/api/jobs/{id}` | Poll job status |
| POST | `/api/jobs/{id}/cancel` | Cancel a job |
| GET | `/api/engines` | List available engines |
| GET | `/api/settings/keys/status` | Check API key status |
| POST | `/api/settings/keys` | Save API keys |
| GET | `/audio/{filename}` | Serve generated audio |
| GET | `/images/{filename}` | Serve generated album art |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Entryway | Landing / mode selection |
| `/write` | WriteMode | Text + image → music |
| `/listen` | ListenMode | Mic capture → music (with audio preview) |
| `/move` | MoveMode | Motion capture → music |
| `/be` | BeMode | Environment → music |
| `/player` | MomentPlayer | Audio playback + details |
| `/library` | Library | Saved soundscapes |
| `/setup` | Setup | Engine selection + API keys |
| `/prompts` | Prompts | Style prompt customization (global + per-mode) |

---

## Documentation

| Document | Focus |
|----------|-------|
| `docs/overview.md` | Research origins, vision, concept, project scope |
| `docs/architecture.md` | Technical architecture, data flow, API design |
| `docs/creation-modes.md` | Detailed specs for Write, Listen, Move, Be modes |
| `docs/design-guide.md` | Visual design system, colors, typography, components |
| `docs/ai-pipeline.md` | AI services, prompt engineering, generation flow |
