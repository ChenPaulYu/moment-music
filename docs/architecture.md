# Architecture

## Monorepo Structure

```
moment-music/
├── frontend/                       React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── animation/          AnimateIn, PageTransition
│   │   │   ├── layout/             PageLayout, Header, Footer, Logo, AnimatedBackground
│   │   │   └── ui/                 Reusable UI components
│   │   ├── hooks/                  useAudioCapture, useAudioPlayer, useDeviceMotion
│   │   ├── lib/                    api, engine, jobs, library, stylePrompts, types, utils
│   │   ├── pages/                  One per screen (9 pages)
│   │   └── assets/                 Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                        FastAPI + Python (uv)
│   ├── app/
│   │   ├── main.py                 FastAPI app, CORS, job endpoints, API key management
│   │   ├── routers/                Mode-specific generation endpoints
│   │   │   ├── generate.py         POST /api/generate — Be mode
│   │   │   ├── write.py            POST /api/write/generate — Write mode
│   │   │   ├── listen.py           POST /api/listen/generate — Listen mode
│   │   │   └── move.py             POST /api/move/generate — Move mode
│   │   ├── services/
│   │   │   ├── engines/            Multi-engine audio generation system
│   │   │   │   ├── base.py         AudioEngine ABC, EngineType enum, device detection
│   │   │   │   ├── ace_step.py     ACE-STEP (local, default engine)
│   │   │   │   ├── heart_mula.py   HeartMuLa 3B (local, lyrics-conditioned)
│   │   │   │   ├── stable_audio_open.py   Stable Audio Open (local, HuggingFace)
│   │   │   │   ├── stable_audio_api.py    Stable Audio API (cloud, Stability AI)
│   │   │   │   └── qwen3_tts.py    Qwen3-TTS narration voice synthesis
│   │   │   ├── jobs.py             Async job queue with concurrency control
│   │   │   ├── prompt_generation.py  LLM-based prompt generation for all modes/outputs
│   │   │   ├── vision.py           GPT-5.2 image captioning
│   │   │   ├── image_generation.py GPT-5.2 album art generation
│   │   │   ├── weather.py          Open-Meteo weather data
│   │   │   ├── geocoding.py        Nominatim reverse geocoding
│   │   │   ├── audio_analysis.py   Audio analysis for Listen mode
│   │   │   └── motion_analysis.py  Motion data analysis for Move mode
│   │   ├── prompts/                LLM prompt templates (.md files)
│   │   └── utils/
│   │       ├── audio_mixing.py     FFmpeg-based narration + music mixing
│   │       └── helpers.py          Duration estimation, audio duration
│   ├── audio/                      Generated audio output (gitignored)
│   ├── images/                     Generated album art (gitignored)
│   ├── models/                     AI model checkpoints (gitignored)
│   ├── pyproject.toml
│   └── .env                        API keys (gitignored)
│
├── docs/                           Design & architecture documentation
├── dev.sh                          Start both servers
├── run-backend.sh                  Start backend only
├── run-frontend.sh                 Start frontend only
└── CLAUDE.md                       Developer guide
```

## Data Flow

### Job-Based Generation Pipeline

All generation goes through an async job queue. The frontend submits a request, receives a `job_id`, then polls for status.

```
Frontend (user input)
    ↓ POST /api/{mode}/generate → returns { job_id }
    ↓
Job Queue (max 1 concurrent, max 3 queued)
    ↓ acquire semaphore
    ↓
┌─────────────────────────────────────────┐
│ Input Processing (mode-dependent)       │
│                                         │
│  Be:     Location → Geocode → Weather   │
│  Write:  Text + Image → GPT-5.2 caption │
│  Listen: Audio blob → analysis          │
│  Move:   Motion JSON → pattern extract  │
└─────────────────────────────────────────┘
    ↓ collected context
LLM Prompt Generation (GPT-5.2 via OpenAI SDK)
    ↓ mood_keywords, summary, music_prompt (or lyrics + tags, or narration text)
    ↓
┌─────────────────────────────────────────┐
│ Audio Generation (engine-dependent)     │
│                                         │
│  Instrumental → ACE-STEP / HeartMuLa /  │
│                 Stable Audio Open/API   │
│  Song → ACE-STEP / HeartMuLa           │
│        (lyrics + tags → vocal track)    │
│  Narration → Qwen3-TTS (voice) +       │
│              engine (BG music) → mix    │
└─────────────────────────────────────────┘
    ↓
[Album Art Generation] (GPT-5.2 image gen, parallel with audio)
    ↓
Job completed → result stored
    ↓
Frontend polls GET /api/jobs/{id} → receives result
    ↓
Moment Player (playback + details)
```

### Frontend Polling Flow

```
Submit generation request
    ↓
Receive { job_id }
    ↓
Poll GET /api/jobs/{id} every 2 seconds
    ↓ shows step progress (e.g. "Interpreting mood", "Generating audio")
    ↓
Status = "completed" → navigate to Moment Player
Status = "failed" → show error with retry option
```

## API Design

### Generation Endpoints

Each creation mode has its own endpoint:

| Method | Endpoint | Content-Type | Mode |
|--------|----------|-------------|------|
| POST | `/api/generate` | `application/json` | Be |
| POST | `/api/write/generate` | `multipart/form-data` | Write |
| POST | `/api/listen/generate` | `multipart/form-data` | Listen |
| POST | `/api/move/generate` | `application/json` | Move |

All return `{ "job_id": "..." }` on success.

### Be Mode — `POST /api/generate`

```json
{
  "location": "Taipei 101",
  "engine": "ace_step",
  "duration": 30,
  "output_type": "instrumental",
  "generate_image": true,
  "style_prompts": { "music_prompt_style": "..." }
}
```

### Write Mode — `POST /api/write/generate`

Multipart form data:
| Field | Type | Required |
|-------|------|----------|
| `text` | string | At least text or image |
| `image` | file | At least text or image |
| `output_type` | string | Yes |
| `engine` | string | No (default: ace_step) |
| `duration` | int | No (default: 30) |
| `generate_image` | string ("true"/"false") | No |
| `style_prompts` | JSON string | No |

### Listen Mode — `POST /api/listen/generate`

Multipart form data:
| Field | Type | Required |
|-------|------|----------|
| `audio` | file (webm/wav) | Yes |
| `output_type` | string | Yes |
| `engine` | string | No |
| `generate_image` | string | No |
| `style_prompts` | JSON string | No |

### Move Mode — `POST /api/move/generate`

```json
{
  "motion_data": "{...serialized motion JSON...}",
  "output_type": "instrumental",
  "engine": "ace_step",
  "generate_image": true,
  "style_prompts": {}
}
```

### Job Status — `GET /api/jobs/{id}`

```json
{
  "id": "a1b2c3d4e5f6",
  "status": "running",
  "step": 1,
  "steps": ["Interpreting mood", "Generating audio", "Finalizing"],
  "result": null,
  "error": null,
  "mode": "write",
  "output_type": "instrumental",
  "queue_position": 0
}
```

### Completed Job Result (example)

```json
{
  "output_type": "instrumental",
  "mood_keywords": ["calm", "introspective", "soft"],
  "summary": "Clouds hover low, matching the stillness...",
  "prompt": "Band | Genre: Ambient | Instruments: piano, rain textures...",
  "engine": "ace_step",
  "audio_url": "/audio/a1b2c3d4.mp3",
  "image_url": "/images/e5f6g7h8.png"
}
```

### Other Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/jobs/{id}/cancel` | Cancel a queued/running job |
| GET | `/api/engines` | List available engines with status |
| GET | `/api/settings/keys/status` | Check which API keys are configured |
| POST | `/api/settings/keys` | Save API keys (OpenAI, Stability, HuggingFace) |
| GET | `/audio/{filename}` | Serve generated audio files |
| GET | `/images/{filename}` | Serve generated album art images |

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Entryway | Immersive portal with 4 mode cards |
| `/write` | WriteMode | Text + image capture → music |
| `/listen` | ListenMode | Ambient audio capture with preview → music |
| `/move` | MoveMode | Device motion capture → music |
| `/be` | BeMode | Environmental context → music |
| `/player/:jobId` | MomentPlayer | Audio playback + album art + details (unique URL per generation) |
| `/library` | Library | Saved soundscapes collection |
| `/setup` | Setup | Engine selection + API key management |
| `/prompts` | Prompts | Style prompt customization (global + per-mode) |

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build + dev server + proxy)
- Tailwind CSS v3.4
- React Router v6 (client-side routing)
- localStorage for state persistence (engine prefs, style prompts, library)

**Backend:**
- FastAPI (Python 3.12+)
- uv (package manager — never use pip)
- OpenAI SDK (GPT-5.2 for vision, reasoning, image generation)
- PyTorch (local model inference)
- uvicorn (ASGI server, `--loop asyncio`)

**AI Engines:**
- ACE-STEP (default music engine, local)
- HeartMuLa (lyrics-conditioned, local, needs 36GB+ VRAM)
- Stable Audio Open (diffusion-based, local, needs HF_TOKEN)
- Stable Audio API (cloud, needs STABILITY_API_KEY)
- Qwen3-TTS (narration voice, local)

**External APIs:**
- OpenAI API (GPT-5.2)
- Open-Meteo (weather, free, no key)
- Nominatim/OSM (geocoding, free, no key)
