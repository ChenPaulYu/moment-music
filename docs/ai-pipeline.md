# AI Pipeline

How moment inputs are transformed into music through the AI services.

---

## Pipeline Overview

```
User Input (text, image, audio, motion, location)
    ↓
[Input Processing Layer]
  ├── Image → GPT-5.2 Vision → caption (Write mode)
  ├── Location → Nominatim geocoding → Open-Meteo weather (Be mode)
  ├── Audio → audio analysis (Listen mode)
  ├── Motion → pattern extraction (Move mode)
  └── Text → pass-through (Write mode)
    ↓
[Context Assembly]
  All processed inputs merged into unified context
    ↓
[LLM Prompt Generation] (GPT-5.2 via OpenAI SDK)
  Per-output-type prompt generation:
  ├── Instrumental → mood_keywords, summary, suggested_prompt
  ├── Song → mood_keywords, summary, lyrics, music_tags
  └── Narration → mood_keywords, summary, narration_text, background_music_prompt
    ↓
[Album Art Generation] (GPT-5.2 image gen, runs in parallel with audio)
  Input: mood_keywords, summary → 1024x1024 cover image
    ↓
[Audio Generation] (engine-dependent)
  ├── Instrumental → selected engine (prompt → audio)
  ├── Song → ACE-STEP or HeartMuLa (lyrics + tags → vocal track)
  └── Narration → Qwen3-TTS (voice) + engine (BG music) → FFmpeg mix
    ↓
Generated audio (.mp3) + album art (.png)
```

---

## Music Engine System

The backend supports multiple interchangeable audio generation engines. Users select their preferred engine per output type in the Setup page.

### Engine Architecture

All engines implement the `AudioEngine` abstract base class:

```python
class AudioEngine(ABC):
    name: str
    engine_type: EngineType
    requires_gpu: bool = False

    async def generate(self, prompt: str, duration: float, output_path: Path, **kwargs) -> Path
    def is_available(self) -> bool
    def unload(self)  # release GPU memory after generation
    def info(self) -> dict
```

Engines are lazy-loaded and cached. After each generation, `unload()` is called to free GPU memory for the next engine.

### Model Downloads

Local engines require model checkpoints in `backend/models/` (gitignored). Use the download script:

```bash
cd backend
uv run python scripts/download_models.py              # interactive selection
uv run python scripts/download_models.py --all         # download everything
uv run python scripts/download_models.py ace_step      # just the default engine
uv run python scripts/download_models.py --list        # list available models
```

| Model Key | Name | Size | Notes |
|-----------|------|------|-------|
| `ace_step` | ACE-STEP 1.5 | ~4 GB | Default engine. Includes 5Hz LM (1.7B) for optional chain-of-thought reasoning. |
| `qwen3_tts` | Qwen3-TTS 1.7B | ~3.5 GB | Required for Narration output |
| `heart_mula` | HeartMuLa 3B + HeartCodec | ~6 GB | Lyrics-conditioned, needs 36GB+ VRAM |
| `stable_audio` | Stable Audio Open 1.0 | ~2.5 GB | Gated — accept license at HuggingFace first, needs `HF_TOKEN` |

Each engine checks availability at startup. Missing models make that engine unavailable (not an error).

### Available Engines

| Engine | Type Enum | Hardware | Outputs | Notes |
|--------|-----------|----------|---------|-------|
| **ACE-STEP** | `ace_step` | MPS / CUDA / CPU | Instrumental, Song, Narration BG | Default engine, works on Apple Silicon. Optional 5Hz LM for chain-of-thought reasoning (MLX on Apple Silicon, PyTorch elsewhere). |
| **HeartMuLa** | `heart_mula` | CUDA / MPS (36GB+) | Song (lyrics-conditioned) | 3B model, needs large VRAM |
| **Stable Audio Open** | `stable_audio_open` | MPS / CUDA / CPU | Instrumental | Requires `HF_TOKEN` |
| **Stable Audio API** | `stable_audio_api` | None (cloud) | Instrumental | Requires `STABILITY_API_KEY` |
| **Qwen3-TTS** | `qwen3_tts` | MPS / CUDA / CPU | Narration voice | Text-to-speech, local |

### ACE-STEP LLM Backend (Optional)

ACE-STEP has a two-phase pipeline:

1. **LM phase** (optional) — A 1.7B Qwen3-based model generates chain-of-thought metadata (BPM, key, time signature, enriched caption) and semantic audio codes that condition the diffusion.
2. **DiT phase** — Diffusion transformer generates audio, conditioned on text + optional codes from LM.

When the `acestep-5Hz-lm-1.7B` model is present in `backend/models/checkpoints/` and `ACE_STEP_THINKING=true`, the LM phase runs before diffusion. On Apple Silicon, LM inference uses MLX (`mlx-lm`) for native acceleration (~10 tok/s). On CUDA/CPU, it falls back to PyTorch.

The LM phase adds ~34 seconds but improves musical coherence and prompt adherence. It is **off by default** (`ACE_STEP_THINKING=false`) for faster iteration.

| Variable | Default | Purpose |
|----------|---------|---------|
| `ACE_STEP_THINKING` | `false` | Enable LLM chain-of-thought before diffusion |

### Device Detection

```python
def get_device() -> str:
    # Priority: cuda (NVIDIA) > mps (Apple Silicon) > cpu
```

### HeartMuLa Configuration

HeartMuLa supports env vars for easy hardware migration:

| Variable | Default | Options |
|----------|---------|---------|
| `HEARTMULA_DEVICE` | auto-detected | `cuda`, `mps`, `cpu` |
| `HEARTMULA_DTYPE` | `float16` (GPU), `float32` (CPU) | `float16`, `bfloat16`, `float32` |
| `HEARTMULA_LAZY_LOAD` | `true` | `true`, `false` |
| `HEARTMULA_VERSION` | `3B` | Model version subfolder |

---

## Service Details

### OpenAI GPT-5.2 — Vision + Reasoning + Image Generation

GPT-5.2 handles three tasks in the pipeline:

#### 1. Image Captioning (`services/vision.py`)

- System prompt instructs purely descriptive output — no emotional inference
- Focus on: objects, setting, people, actions, lighting, colors, textures
- Used in Write mode when user uploads an image

#### 2. Prompt Generation (`services/prompt_generation.py`)

Per-mode, per-output-type prompt generation functions:

| Mode | Instrumental | Song | Narration |
|------|-------------|------|-----------|
| Be | `interpret_weather_to_music_prompt` | `interpret_weather_to_song` | `interpret_weather_to_narration` |
| Write | `interpret_write_to_music_prompt` | `interpret_write_to_song` | `interpret_write_to_narration` |
| Listen | `interpret_listen_to_music_prompt` | `interpret_listen_to_song` | `interpret_listen_to_narration` |
| Move | `interpret_move_to_music_prompt` | `interpret_move_to_song` | `interpret_move_to_narration` |

**Instrumental output format:**
```
[Solo/Band/Orchestra] | Genre: [genre] | Instruments: [list] |
Moods: [mood1, mood2, mood3] | BPM: [optional] | Additional: [texture, style]
```

**Song output:** Returns lyrics + music_tags (genre/instrument tags for the engine).

**Narration output:** Returns narration_text (spoken word script) + background_music_prompt.

**Style prompts** are passed through from the frontend. Resolution order: mode override → global → built-in default.

#### 3. Album Art Generation (`services/image_generation.py`)

- Input: mood_keywords + summary → art direction prompt
- Output: 1024x1024 PNG album cover
- Runs in parallel with audio generation (doesn't need GPU)
- Abstract, atmospheric style matching the mood

**Prompt templates** stored in `backend/app/prompts/` as `.md` files.

---

### Weather Data — Open-Meteo (`services/weather.py`)

- Free weather API, no API key required
- Input: latitude/longitude from geocoding
- Output: temperature, weather description, humidity, wind, etc.
- Used in Be mode

### Geocoding — Nominatim (`services/geocoding.py`)

- OpenStreetMap-based geocoding, free, no API key
- Input: location text (e.g. "Taipei 101")
- Output: latitude/longitude coordinates
- Used in Be mode

### Audio Analysis (`services/audio_analysis.py`)

- Analyzes captured ambient audio from Listen mode
- Extracts features for LLM context

### Motion Analysis (`services/motion_analysis.py`)

- Analyzes device motion sensor data from Move mode
- Extracts: tempo from step frequency, energy from acceleration, flow from gyroscope
- Maps patterns to musical parameters

---

## Narration Pipeline

Narration output involves three stages:

1. **Script generation** — LLM writes narration text from mood interpretation
2. **Voice synthesis** — Qwen3-TTS generates spoken audio from the script
3. **Background music** — Selected engine generates ambient music matched to voice duration
4. **Mixing** — FFmpeg combines voice + music with appropriate levels (`utils/audio_mixing.py`)

---

## Job Queue System (`services/jobs.py`)

All generation runs through an async job queue:

- **Max concurrent:** 1 (GPU-bound — only one model can run at a time)
- **Max queue:** 3 active jobs (HTTP 503 "Server is busy" when exceeded)
- **Cancellation:** Jobs can be cancelled at any step; checked between pipeline stages
- **Cleanup:** Completed/failed/cancelled jobs auto-cleaned after 1 hour

Job lifecycle: `queued → running → completed | failed | cancelled`

---

## Environment Variables

All API keys stored in `backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...

# Optional — engine-specific
STABILITY_API_KEY=sk-...       # for Stable Audio API (Cloud)
HF_TOKEN=hf_...                # for Stable Audio Open (HuggingFace)

# Optional — HeartMuLa tuning
HEARTMULA_DEVICE=              # auto-detected if not set
HEARTMULA_DTYPE=float16
HEARTMULA_LAZY_LOAD=true
HEARTMULA_VERSION=3B

# Optional — ACE-STEP LLM thinking
ACE_STEP_THINKING=false       # true = better quality (+~34s), false = faster (DiT only)

# Optional — generation defaults
DEFAULT_ENGINE=ace_step
DEFAULT_DURATION=30
DEFAULT_OUTPUT_TYPE=instrumental
```

API keys can also be configured from the Setup page (`/setup`) in the browser.

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Engine not available | HTTP 503 before job creation |
| Queue full | HTTP 503 "Server is busy" |
| Geocoding fails | Job fails with error message |
| Weather API down | Job fails with error message |
| Image captioning fails | Job fails with error message |
| Audio generation fails | Job fails; user sees error + can retry |
| TTS not available (narration) | HTTP 503 before job creation |
| Job cancelled by user | Job marked cancelled, resources freed |
