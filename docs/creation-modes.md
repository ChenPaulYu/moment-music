# Creation Modes

Each mode captures a different dimension of a moment.

---

## Write Mode

**Input:** Text journal + optional image upload
**Captures:** Inner thoughts, reflections, visual context

### User Flow
1. User writes a journal entry (up to 500 characters) describing their moment
2. Optionally uploads an image (photo of current scene, mood board, etc.)
3. Selects output type: Instrumental / Song / Narration
4. Taps "Generate Soundscape"

### Backend Processing
1. If image provided → GPT-5.2 captioning (objective visual description)
2. Journal text + image caption → Mood interpretation agent
3. Agent outputs: mood_keywords, poetic summary, structured music prompt
4. Music prompt → Stable Audio 2 (or ACE-STEP for Song, Voicebox for Narration)

### UI Elements
- Textarea (journal entry, 500 char limit)
- Image upload button with preview
- Output type segmented control
- Generate button
- Status footer

### Closest Reference
This is the most direct mapping from the `ai_sonification` prototype. The existing `weather_to_prompt.py` pipeline handles journal + image → music prompt.

---

## Listen Mode

**Input:** Microphone ambient sound capture
**Captures:** Sonic environment — the sounds around you right now

### User Flow
1. User taps the large mic button to start recording
2. Visualizer bars animate during capture (up to configurable duration)
3. Timer shows elapsed / max time
4. Recording auto-stops or user taps again to stop
5. Selects output type, taps Generate

### Backend Processing
1. Captured audio sent as reference_audio
2. Optional: audio analysis for scene description (future)
3. Audio → audio2audio mode in Stable Audio 2
4. The captured ambient becomes the seed for transformation

### UI Elements
- Large circular mic button (pulsing when active)
- Audio visualizer bars (animated wave pattern)
- Timer display (elapsed / max)
- Output type segmented control
- Generate button

### Technical Notes
- Uses Web Audio API + MediaRecorder for browser capture
- Audio sent as WAV/MP3 to backend
- Stable Audio's audio2audio with `strength` parameter controls transformation degree

---

## Move Mode

**Input:** Device motion sensors (accelerometer, gyroscope)
**Captures:** Physical energy, rhythm, gesture

### User Flow
1. User taps "Start Capture" button
2. Device motion sensors begin recording
3. User moves freely — walking, dancing, gesturing
4. Capture stops after duration or user taps again
5. Motion data visualized, selects output type, taps Generate

### Backend Processing
1. Motion data (JSON) sent to backend
2. Motion patterns analyzed: tempo from step frequency, energy from acceleration magnitude, flow from gyroscope smoothness
3. Patterns mapped to musical parameters (BPM, intensity, texture)
4. Combined with any environmental data for music prompt
5. Prompt → Stable Audio 2

### UI Elements
- Large circular "Start Capture" button
- Device rotation icon indicating motion tracking
- Motion visualization (during/after capture)
- Output type segmented control
- Generate button
- Status text: "Capture movement to enable generation"

### Technical Notes
- Uses DeviceMotion API (requires HTTPS and user permission)
- Fallback for desktop: simplified input or unavailable state
- Motion data serialized as JSON array of {timestamp, accel, gyro} readings

---

## Be Mode

**Input:** Auto-detected location + weather + time of day
**Captures:** Environmental atmosphere — where and when you are

### User Flow
1. User taps "Fetch Environment" button
2. System detects: location (GPS or IP), weather (API), time of day
3. Environmental data displayed: city, weather condition, time period
4. User can optionally adjust or add context
5. Selects output type, taps Generate

### Backend Processing
1. Location → OpenCage geocoding → lat/lon
2. Lat/lon → OpenWeatherMap → weather data (temp, humidity, condition, wind)
3. Time of day derived from local timezone
4. All context → Mood interpretation agent
5. Agent outputs prompt optimized for atmospheric/ambient generation
6. Prompt → Stable Audio 2

### UI Elements
- Large "Fetch Environment" button
- Environmental data display cards (Location, Weather, Time)
- Output type segmented control
- Generate button

### Closest Reference
Be mode directly maps to the location/weather pipeline in `ai_sonification` — the `openweather_api.py`, `opencage_api.py`, and geolocation logic.

---

## Output Types (Shared Across Modes)

### Instrumental (Phase 1)
- Pure AI-generated music
- Engine: Stable Audio 2
- Parameters: prompt, duration, seed, steps, cfg_scale

### Song (Phase 3)
- AI-generated vocals + lyrics over instrumental
- Engine: ACE-STEP
- Requires: melody/backing from Stable Audio + lyric generation

### Narration (Phase 3)
- Spoken word over ambient soundtrack
- Engine: Voicebox (Qwen3-TTS, local-first or remote server)
- Requires: script generation from mood summary + voice synthesis via Voicebox REST API
