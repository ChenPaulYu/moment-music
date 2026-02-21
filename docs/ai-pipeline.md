# AI Pipeline

How moment inputs are transformed into music through the AI services.

---

## Pipeline Overview

```
User Input (text, image, audio, motion, location)
    ↓
[Input Processing Layer]
  ├── Image → GPT-5.2 Vision → caption
  ├── Location → OpenCage → lat/lon → OpenWeatherMap → weather data
  ├── Audio → (pass-through for audio2audio)
  ├── Motion → pattern extraction (BPM, energy, flow)
  └── Text → (pass-through)
    ↓
[Context Assembly]
  All processed inputs merged into unified context object
    ↓
[Mood Interpretation Agent] (GPT-5.2 via Pydantic-AI)
  System prompt: music prompt designer role
  Base prompt: structured output format
  Note: LLM acts as dynamic controller — can select/configure generation models
    ↓ outputs:
  - mood_keywords: 3 evocative words
  - summary: poetic narrative of the moment
  - suggested_prompt: structured music generation prompt
    ↓
[Album Cover Generation] (GPT-5.2 Image Generation)
  Input: mood_keywords, summary, suggested_prompt
  Output: AI-generated cover art image (1024×1024)
    ↓
[Audio Generation]
  ├── Instrumental → Stable Audio 2 (text2audio or audio2audio)
  ├── Song → ACE-STEP (vocals over instrumental) [Phase 3]
  └── Narration → Voicebox / Qwen3-TTS (voice over ambient) [Phase 3]
    ↓
Generated audio file (.mp3)
```

---

## Service Details

### OpenAI GPT-5.2 (Image Captioning + Mood Interpretation)

GPT-5.2 handles both vision and reasoning tasks in the pipeline.

#### Image Captioning

**Purpose:** Objective visual description of uploaded images.

**Approach:**
- System prompt instructs purely descriptive output — no emotional inference
- Focus on: objects, setting, people, actions, lighting, colors, textures, layout
- Returns structured `ImageCaption` via Pydantic model

**Why no emotion?** The mood interpretation agent handles all emotional analysis. Keeping captioning objective prevents double-interpretation bias.

#### Mood Interpretation

**Purpose:** Synthesize all context into a music prompt.

**Agent Setup (Pydantic-AI):**
- System prompt defines role as "music prompt designer"
- Base prompt provides output format and constraints
- Structured output: `WeatherInterpretation` model with mood_keywords, summary, suggested_prompt

**Music Prompt Format:**
```
[Solo/Band/Orchestra] | Genre: [genre] | Subgenre: [optional] |
Instruments: [list] | Moods: [mood1, mood2, mood3] |
BPM: [optional] | Additional descriptors: [texture, style]
```

**Prompt Templates** stored in `backend/app/prompts/`:
- `weather_music_system.txt` — agent role definition
- `weather_music_base.txt` — output structure and instructions
- `image_caption.txt` — captioning system prompt

### OpenAI GPT-5.2 (Album Cover Generation)

**Purpose:** Generate unique album cover art for each soundscape based on mood interpretation output.

**Input:** The mood interpretation agent's output — `mood_keywords`, `summary`, and `suggested_prompt` — is used to construct an image generation prompt.

**Process:**
1. Mood keywords and summary are combined into an art direction prompt
2. Prompt is styled toward abstract, atmospheric album art (not photorealistic)
3. GPT-5.2 image generation produces a 1024×1024 cover image
4. Image is stored alongside the generated audio

**Output:** 1024×1024 PNG image used as cover art in MomentPlayer and Library card thumbnails.

**Prompt Strategy:**
- Abstract and evocative visual style matching the mood
- Color palette derived from mood keywords
- Avoids text/typography in generated images
- Consistent with the dark, atmospheric aesthetic of the app

**Used In:**
- `MomentPlayer` — album art display with glow border
- `Library` — soundscape card thumbnails

---

### Stability AI — Stable Audio 2

**Purpose:** Generate actual audio from music prompts.

**Two modes:**

| Mode | Endpoint | Input | When Used |
|------|----------|-------|-----------|
| `text2audio` | `/v2beta/audio/stable-audio-2/text-to-audio` | Prompt only | Write, Move, Be modes |
| `audio2audio` | `/v2beta/audio/stable-audio-2/audio-to-audio` | Prompt + reference audio | Listen mode |

**Parameters:**
| Param | Default | Range | Notes |
|-------|---------|-------|-------|
| `duration` | 20 | 5–180 seconds | Audio length |
| `seed` | 0 | any int | Reproducibility |
| `steps` | 50 | 10–150 | Quality (higher = slower) |
| `cfg_scale` | 7.0 | 1–15 | Prompt adherence strength |
| `strength` | 1.0 | 0–1 | audio2audio transformation degree |
| `output_format` | mp3 | mp3, wav | File format |

### ACE-STEP (Phase 3)

**Purpose:** Generate vocals and lyrics over instrumental backing.
**Integration:** Separate model that takes melody/backing + lyric prompt → vocal track.

### Voicebox / Qwen3-TTS (Phase 3)

**Purpose:** Local-first voice synthesis for narration output.
**Source:** https://github.com/jamiepine/voicebox (MIT license, open-source)
**Engine:** Qwen3-TTS model, with Whisper for transcription
**Deployment:** Local mode (on-device), remote mode (GPU server on network), or server mode
**Integration:** Summary text → Voicebox REST API → narration audio track
**Features:** Voice cloning from brief samples, multi-voice projects, voice profile management

### Gemini API (Phase 3)

**Purpose:** Alternative/advanced LLM reasoning for mood interpretation.
**Integration:** Toggle in user settings to use Gemini instead of GPT-5.2 for interpretation.

---

## Environment Variables

All API keys stored in `backend/.env`:

```env
OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...
OPENCAGE_API_KEY=...
OPENWEATHER_API_KEY=...
VOICEBOX_API_URL=http://localhost:8200  # Phase 3 (local Voicebox server)
GOOGLE_GEMINI_API_KEY=...              # Phase 3
```

---

## Error Handling

| Failure | Fallback |
|---------|----------|
| Geocoding fails | Fall back to IP-based geolocation |
| Weather API down | Skip weather context, proceed with available inputs |
| Image captioning fails | Skip caption, proceed with text/weather |
| Audio generation fails | Return error with prompt (user can retry) |
| No inputs provided | Return 400 with guidance on minimum input |
