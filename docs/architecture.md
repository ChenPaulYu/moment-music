# Architecture

## Monorepo Structure

```
moment-music/
├── frontend/                    React + TypeScript + Vite
│   ├── src/
│   │   ├── components/          Reusable UI components
│   │   ├── hooks/               Custom React hooks
│   │   ├── lib/                 Utilities, API client
│   │   ├── pages/               Page components (one per screen)
│   │   ├── routes/              Routing configuration
│   │   └── assets/              Static assets (fonts, images)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                     FastAPI + Python (uv)
│   ├── app/
│   │   ├── main.py              FastAPI app, CORS, mount routes
│   │   ├── models.py            Pydantic models
│   │   ├── routers/             API endpoint modules
│   │   │   ├── generate.py      POST /generate — main generation endpoint
│   │   │   └── audio.py         GET /audio/{filename} — serve audio files
│   │   ├── services/            Business logic
│   │   │   ├── weather.py       OpenWeatherMap + OpenCage
│   │   │   ├── image.py         GPT-5.2 image captioning
│   │   │   ├── mood.py          Mood interpretation (GPT-5.2 agent)
│   │   │   ├── audio_gen.py     Stable Audio 2 (text2audio, audio2audio)
│   │   │   ├── vocal.py         ACE-STEP vocal generation (Phase 3)
│   │   │   └── narration.py     Voicebox / Qwen3-TTS narration (Phase 3)
│   │   ├── agents/              Pydantic-AI agent definitions
│   │   ├── prompts/             System & base prompt templates (.txt)
│   │   └── utils/               Shared helpers
│   ├── audio/                   Generated audio output (gitignored)
│   ├── pyproject.toml
│   └── .env                     API keys (gitignored)
│
├── docs/                        Design & architecture documentation
├── dev.sh                       Start both servers
├── CLAUDE.md                    Developer guide
└── refs/                        Reference materials (gitignored)
```

## Data Flow

### Generation Pipeline

```
Frontend (user input)
    ↓ POST /api/generate (multipart/form-data)
Backend Router
    ↓
┌─────────────────────────────────────────┐
│ Parallel Input Processing               │
│                                         │
│  [Location] → Geocode → Weather fetch   │
│  [Image]    → GPT-5.2 captioning         │
│  [Journal]  → (pass through)            │
│  [Audio]    → (hold for audio2audio)    │
│  [Motion]   → (extract patterns)        │
└─────────────────────────────────────────┘
    ↓ collected context
Mood Interpretation Agent (GPT-5.2)
    ↓ mood_keywords, summary, music_prompt
Audio Generation (Stable Audio 2)
    ↓ generated .mp3
Response JSON + audio URL
    ↓
Frontend (Moment Player)
```

### API Design

#### `POST /api/generate`

Multipart form data. All fields optional (at least one input required).

**Request:**
| Field | Type | Modes | Notes |
|-------|------|-------|-------|
| `location` | string | Be, Write | Text like "Taipei 101" or "auto" for IP detection |
| `journal` | string | Write | Personal text, up to 500 chars |
| `image` | file | Write | JPEG/PNG image |
| `reference_audio` | file | Listen | Captured ambient audio |
| `motion_data` | string (JSON) | Move | Serialized motion sensor data |
| `duration` | int | All | Audio length in seconds (5-180, default 20) |
| `output_type` | string | All | "instrumental", "song", or "narration" |
| `mode` | string | All | "write", "listen", "move", "be" |

**Response (200):**
```json
{
  "location": "25.0340, 121.5624",
  "image_caption": "A rainy city street...",
  "weather_summary": "Taipei | 22.5°C | light rain | Humidity 72%",
  "mood_keywords": ["calm", "introspective", "soft"],
  "summary": "Clouds hover low, matching the stillness...",
  "prompt": "Band | Genre: Ambient | Instruments: piano, rain textures...",
  "mode": "write",
  "output_type": "instrumental",
  "audio_url": "/api/audio/generated_music.mp3"
}
```

#### `GET /api/audio/{filename}`

Serves generated audio files from `backend/audio/`.

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Entryway | Immersive portal with 4 mode cards |
| `/write` | Write Mode | Text + image capture |
| `/listen` | Listen Mode | Ambient audio capture |
| `/move` | Move Mode | Motion capture |
| `/be` | Be Mode | Environmental context |
| `/player` | Moment Player | Playback + results |
| `/profile` | Profile | Settings + account |

## Tech Stack Summary

**Frontend:**
- React 18+ with TypeScript
- Vite (build + dev server)
- Tailwind CSS v4
- React Router (client-side routing)

**Backend:**
- FastAPI (Python 3.12+)
- uv (package manager)
- Pydantic-AI (structured LLM agents)
- uvicorn (ASGI server, `--loop asyncio`)

**External Services:**
- OpenAI API (GPT-5.2 for vision and reasoning)
- Stability AI API (Stable Audio 2)
- ACE-STEP (vocal generation, Phase 3)
- Voicebox / Qwen3-TTS (narration, local-first, Phase 3)
- Gemini API (alternative reasoning, Phase 3)
- OpenWeatherMap API (weather data)
- OpenCage API (geocoding)
