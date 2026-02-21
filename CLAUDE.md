# CLAUDE.md

Guide for Claude Code when working with Moment Music.

## What is Moment Music?

**Moment Music** is an AI-powered generative music platform that transforms real-world moments into unique soundscapes. Users capture moments through multiple modalities — writing, listening, movement, and environmental context — and AI interprets the emotional atmosphere to generate personalized audio.

**Core Philosophy:** Every moment has a sound. Moment Music bridges the gap between lived experience and musical expression through multimodal AI.

See `docs/overview.md` for full vision and architecture.

---

## Four Creation Modes

1. **Write** - Text journal + image upload → mood interpretation → music
2. **Listen** - Ambient sound capture → audio analysis → music
3. **Move** - Device motion capture → movement patterns → music
4. **Be** - Environmental context (location, weather, time) → atmosphere → music

Each mode captures a different dimension of a moment. Modes can be used independently.

See `docs/creation-modes.md` for detailed mode specifications.

---

## Architecture Overview

**Monorepo Structure:**
```
moment-music/
├── frontend/  (React + TypeScript + Vite)
├── backend/   (FastAPI + Python)
├── docs/      (Design & architecture docs)
└── refs/      (Reference materials, gitignored)
```

**Frontend:** React + TypeScript + Vite on `http://localhost:5173`
**Backend:** FastAPI + Python (uv) on `http://localhost:8000`

See `docs/architecture.md` for technical details.

---

## AI Services

| Service | Purpose | Used In |
|---------|---------|---------|
| OpenAI GPT-5.2 | Image captioning, mood interpretation, prompt generation | Write, Be |
| Stability AI (Stable Audio 2) | Instrumental music generation (text2audio, audio2audio) | All modes |
| ACE-STEP | Vocal & lyric generation | Song output |
| Voicebox (Qwen3-TTS) | Narration voice synthesis (local-first, open-source) | Narration output |
| Gemini API | Alternative LLM reasoning | Advanced processing |
| OpenWeatherMap | Real-time weather data | Be mode |
| OpenCage | Geocoding (location → coordinates) | Be mode |

---

## Development Setup

**Backend (uv — always use uv, never pip):**
```bash
cd backend
uv sync                # install all packages
uv add <package>       # add new dependency
uv run uvicorn app.main:app --reload --port 8000 --loop asyncio
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Both (recommended):**
```bash
./dev.sh
```

---

## Tooling Rules

- **Python packages:** Always use `uv add` to add packages, `uv sync` to install. Never use `pip install`.
- **Environment variables:** Use `python-dotenv` to load API keys and config from `backend/.env`. Never hardcode secrets.
- **E2E testing:** Use `agent-browser` CLI for browser testing (not Playwright/Cypress directly).
  ```bash
  agent-browser open http://localhost:5173   # open app
  agent-browser snapshot                     # accessibility tree (for AI)
  agent-browser screenshot                   # capture current state
  agent-browser click <selector>             # interact with elements
  agent-browser fill <selector> <text>       # fill form fields
  ```

---

## Git Conventions

- **Commit messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/). Format: `<type>: <description>`
  - `feat:` — New feature
  - `fix:` — Bug fix
  - `docs:` — Documentation only
  - `style:` — Formatting, no logic change
  - `refactor:` — Code restructuring, no behavior change
  - `test:` — Adding or updating tests
  - `chore:` — Build, tooling, config changes
- **Branching:** Use feature branches off `main`. Merge via PR.
- **Commit often** — Small, focused commits are preferred over large monolithic ones.

---

## Design Language

- Dark-mode-first, glass morphism aesthetic
- Primary color: `#3713ec` (vivid indigo)
- Font: Space Grotesk (display), system sans-serif (body)
- Tailwind CSS for styling
- Animated gradients, visualizers, ambient UI

See `docs/design-guide.md` for visual design system.

---

## Key Constraints

- **Mode independence** - Each creation mode works standalone
- **Output flexibility** - Three output types: Instrumental, Song, Narration
- **Async pipeline** - AI processing is async; UI shows progress states
- **API keys external** - All secrets in `.env`, never committed
- **Audio ephemeral** - Generated audio in `backend/audio/`, gitignored

---

## Documentation Structure

| Document | Focus |
|----------|-------|
| `docs/overview.md` | Research origins, vision, concept, project scope |
| `docs/architecture.md` | Technical architecture, data flow, API design |
| `docs/creation-modes.md` | Detailed specs for Write, Listen, Move, Be modes |
| `docs/design-guide.md` | Visual design system, colors, typography, components |
| `docs/ai-pipeline.md` | AI services, prompt engineering, generation flow |
