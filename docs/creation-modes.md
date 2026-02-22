# Creation Modes

Each mode captures a different dimension of a moment.

---

## Write Mode

**Input:** Text journal + optional image upload (including camera capture)
**Captures:** Inner thoughts, reflections, visual context
**Route:** `/write`
**Endpoint:** `POST /api/write/generate` (multipart/form-data)

### User Flow
1. User writes a journal entry describing their moment
2. Optionally uploads an image or takes a photo with device camera
3. Selects output type: Instrumental / Song / Narration
4. Taps "Generate Soundscape"
5. Sees step-by-step progress (e.g. "Captioning image", "Interpreting mood", "Generating audio")
6. Navigated to Moment Player on completion

### Backend Processing
1. If image provided → GPT-5.2 captioning (objective visual description)
2. Journal text + image caption → LLM prompt generation (per output type)
3. For instrumental: prompt → music engine
4. For song: lyrics + tags → ACE-STEP or HeartMuLa
5. For narration: narration text → Qwen3-TTS, BG prompt → engine, then FFmpeg mix
6. Album art generated in parallel via GPT-5.2 image generation

### UI Elements
- Textarea (journal entry)
- Image upload button with preview (supports camera capture via `capture="environment"`)
- Output type selector (Instrumental / Song / Narration)
- Generate button with step progress
- Style prompts passed from `/prompts` page configuration

---

## Listen Mode

**Input:** Microphone ambient sound capture
**Captures:** Sonic environment — the sounds around you right now
**Route:** `/listen`
**Endpoint:** `POST /api/listen/generate` (multipart/form-data)

### User Flow
1. User taps the mic button to start recording
2. Visualizer bars animate during capture
3. Timer shows elapsed time
4. Recording stops on tap or when max duration reached
5. **Audio preview** — user can play back the recording before generating
6. Selects output type, taps Generate
7. Step progress shown during generation

### Backend Processing
1. Captured audio sent as `audio` field (webm format)
2. Audio analyzed for scene description
3. Analysis + context → LLM prompt generation
4. Prompt → selected engine for audio generation
5. Album art generated in parallel

### UI Elements
- Large circular mic button (pulsing when active)
- Audio visualizer bars (animated wave pattern)
- Timer display (elapsed time)
- **Audio preview player** — play/pause button + progress bar + time display (appears after recording)
- Output type selector
- Generate button with step progress

### Technical Notes
- Uses Web Audio API + MediaRecorder for browser capture
- Audio sent as WebM to backend
- Audio preview uses object URL, auto-revoked on new recording or unmount

---

## Move Mode

**Input:** Device motion sensors (accelerometer, gyroscope)
**Captures:** Physical energy, rhythm, gesture
**Route:** `/move`
**Endpoint:** `POST /api/move/generate` (JSON)

### User Flow
1. User taps "Start Capture" button
2. Device motion sensors begin recording
3. User moves freely — walking, dancing, gesturing
4. Capture stops after duration or user taps again
5. Motion data serialized, selects output type, taps Generate

### Backend Processing
1. Motion data (JSON) sent to backend
2. Motion patterns analyzed: tempo from step frequency, energy from acceleration magnitude, flow from gyroscope smoothness
3. Patterns → LLM prompt generation
4. Prompt → selected engine
5. Album art generated in parallel

### UI Elements
- Large circular "Start Capture" button
- Device motion indicators during capture
- Output type selector
- Generate button with step progress

### Technical Notes
- Uses DeviceMotion API (requires HTTPS and user permission)
- Fallback for desktop: simplified input or unavailable state
- Motion data serialized as JSON

---

## Be Mode

**Input:** Location text → auto-detected weather + time of day
**Captures:** Environmental atmosphere — where and when you are
**Route:** `/be`
**Endpoint:** `POST /api/generate` (JSON)

### User Flow
1. User enters a location (e.g. "Taipei 101", "Central Park NYC")
2. System fetches: geocoding → coordinates → weather data
3. Environmental data displayed on Moment Player after generation
4. Selects output type, taps Generate

### Backend Processing
1. Location text → Nominatim geocoding → lat/lon
2. Lat/lon → Open-Meteo → weather data (temp, humidity, condition, wind)
3. Weather context → LLM prompt generation
4. Prompt → selected engine
5. Album art generated in parallel

### UI Elements
- Location text input
- Output type selector
- Generate button with step progress

### Technical Notes
- Uses Open-Meteo (free, no API key) for weather
- Uses Nominatim/OSM (free, no API key) for geocoding

---

## Output Types (Shared Across All Modes)

### Instrumental
- Pure AI-generated music
- Available engines: ACE-STEP (default), HeartMuLa, Stable Audio Open, Stable Audio API
- Parameters: prompt, duration

### Song
- AI-generated vocals + lyrics
- Available engines: ACE-STEP (default), HeartMuLa
- LLM generates lyrics + music tags; engine generates the vocal track

### Narration
- Spoken word over ambient soundtrack
- Voice: Qwen3-TTS (local, open-source)
- Background music: any instrumental engine
- Mixing: FFmpeg combines voice track + music track at appropriate levels
- Duration: background music auto-matched to voice duration

---

## Style Prompts

Each mode supports customizable style prompts via the Prompts page (`/prompts`):

| Key | Purpose |
|-----|---------|
| `lyrics_style` | Guide lyric writing tone and style |
| `narration_style` | Guide narration script style |
| `bg_music_style` | Guide background music for narration |
| `music_prompt_style` | Guide instrumental music prompt details |
| `overall_mood` | General mood direction |

Resolution: mode-specific override → global setting → built-in default.
