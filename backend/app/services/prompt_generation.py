import base64

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.utils.helpers import load_prompt

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    return _client


def _inject_style(system_prompt: str, style_prompts: dict | None, *keys: str) -> str:
    if not style_prompts:
        return system_prompt
    additions = [style_prompts[k] for k in keys if style_prompts.get(k)]
    if additions:
        return system_prompt + "\n\n## Style Guidelines\n" + "\n".join(additions)
    return system_prompt


def _duration_hint(duration: int, output_type: str) -> str:
    """Build a duration constraint hint for the LLM to keep output length appropriate."""
    if output_type == "song":
        # Singing pace is ~1.5 words/sec (slower than speech)
        max_words = int(duration * 2 * 1.5)
        if duration <= 30:
            structure_hint = "Write only 1-2 short sections (e.g., one verse and one chorus, or just a chorus). Do NOT write a full multi-section song."
        elif duration <= 60:
            structure_hint = "Write 2-3 sections (e.g., verse, chorus, short bridge). Keep each section concise."
        else:
            structure_hint = "You may write a full song structure, but keep it proportional to the duration."
        return (
            f"\n\n## Duration Constraint — CRITICAL\n"
            f"Target duration: ~{duration} seconds (max {duration * 2}s). "
            f"The music engine will attempt to sing ALL lyrics you write within this time. "
            f"If you write too many lyrics, the engine will cut off mid-song and skip sections. "
            f"{structure_hint} "
            f"Aim for ~{max_words} sung words maximum (excluding section markers)."
        )
    else:  # narration
        # ~2.2 words/sec ≈ 130 wpm spoken pace, matching the system prompt guidance.
        max_words = int(duration * 2.2)
        return (
            f"\n\n## Duration Constraint\n"
            f"Target duration: ~{duration} seconds. "
            f"Aim for roughly {max_words} words (~130 words per minute spoken pace). "
            f"Write a full poetic narration — let the moment breathe."
        )


# --- Output models per output type ---


class WeatherInterpretation(BaseModel):
    """Instrumental output — music prompt only."""

    location: str
    summary: str
    mood_keywords: list[str]
    suggested_prompt: str


class NarrationInterpretation(BaseModel):
    """Narration output — spoken text + background music prompt."""

    location: str
    summary: str
    mood_keywords: list[str]
    narration_text: str
    background_music_prompt: str


class SongInterpretation(BaseModel):
    """Song output — lyrics + music style tags."""

    location: str
    summary: str
    mood_keywords: list[str]
    lyrics: str
    music_tags: str


# --- Interpretation functions ---


def _build_weather_context(weather: dict, feeling: str = "") -> str:
    ctx = f"""
    Location: {weather['city']}
    Temperature: {weather['temperature']} °C
    Weather: {weather['weather_main']} ({weather['weather_desc']})
    Wind Speed: {weather['wind_speed']} m/s
    Humidity: {weather['humidity']}%
    """
    if feeling and feeling.strip():
        ctx += f"\n    How I feel right now: {feeling.strip()}\n"
    return ctx


async def interpret_weather_to_music_prompt(
    weather: dict, duration: int = 30, style_prompts: dict | None = None, feeling: str = ""
) -> WeatherInterpretation:
    """Interpret weather data into an instrumental music prompt."""
    system_prompt = load_prompt("weather_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("weather_music_base.md").replace("{duration}", str(duration))
    user_prompt = _build_weather_context(weather, feeling) + "\n\n" + base_prompt

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=WeatherInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_weather_to_narration(
    weather: dict, duration: int = 30, style_prompts: dict | None = None, feeling: str = "", **kwargs
) -> NarrationInterpretation:
    """Interpret weather data into narration text + background music prompt."""
    system_prompt = load_prompt("weather_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("weather_narration_base.md")
    user_prompt = _build_weather_context(weather, feeling) + "\n\n" + base_prompt + _duration_hint(duration, "narration")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_weather_to_song(
    weather: dict, duration: int = 30, style_prompts: dict | None = None, feeling: str = "", **kwargs
) -> SongInterpretation:
    """Interpret weather data into song lyrics + music style tags."""
    system_prompt = load_prompt("weather_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("weather_song_base.md")
    user_prompt = _build_weather_context(weather, feeling) + "\n\n" + base_prompt + _duration_hint(duration, "song")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=SongInterpretation,
    )
    return response.choices[0].message.parsed


# --- Write mode interpretation functions ---


def _build_write_user_message(
    text: str, base_prompt: str, image_bytes: bytes | None = None, image_mime: str | None = None
) -> str | list:
    """Build the user message for Write mode, with optional inline image."""
    user_text = f"\nJournal Entry:\n{text}\n\n{base_prompt}"
    if image_bytes and image_mime:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{image_mime};base64,{b64}"
        return [
            {"type": "text", "text": user_text},
            {"type": "image_url", "image_url": {"url": data_uri}},
        ]
    return user_text


async def interpret_write_to_music_prompt(
    text: str, duration: int = 30, style_prompts: dict | None = None,
    image_bytes: bytes | None = None, image_mime: str | None = None,
) -> WeatherInterpretation:
    """Interpret a journal entry (+ optional image) into an instrumental music prompt."""
    system_prompt = load_prompt("write_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("write_music_base.md").replace("{duration}", str(duration))
    user_content = _build_write_user_message(text, base_prompt, image_bytes, image_mime)

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=WeatherInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_write_to_narration(
    text: str, duration: int = 30, style_prompts: dict | None = None,
    image_bytes: bytes | None = None, image_mime: str | None = None, **kwargs
) -> NarrationInterpretation:
    """Interpret a journal entry (+ optional image) into narration text + background music prompt."""
    system_prompt = load_prompt("write_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("write_narration_base.md") + _duration_hint(duration, "narration")
    user_content = _build_write_user_message(text, base_prompt, image_bytes, image_mime)

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_write_to_song(
    text: str, duration: int = 30, style_prompts: dict | None = None,
    image_bytes: bytes | None = None, image_mime: str | None = None, **kwargs
) -> SongInterpretation:
    """Interpret a journal entry (+ optional image) into song lyrics + music style tags."""
    system_prompt = load_prompt("write_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("write_song_base.md") + _duration_hint(duration, "song")
    user_content = _build_write_user_message(text, base_prompt, image_bytes, image_mime)

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format=SongInterpretation,
    )
    return response.choices[0].message.parsed


# --- Listen mode interpretation functions ---


def _build_listen_context(audio_description: str) -> str:
    return f"\nAmbient Soundscape Description:\n{audio_description}\n"


async def interpret_listen_to_music_prompt(
    audio_description: str, duration: int = 30, style_prompts: dict | None = None
) -> WeatherInterpretation:
    """Interpret an ambient audio description into an instrumental music prompt."""
    system_prompt = load_prompt("listen_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("listen_music_base.md").replace("{duration}", str(duration))
    user_prompt = _build_listen_context(audio_description) + "\n\n" + base_prompt

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=WeatherInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_listen_to_narration(
    audio_description: str, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> NarrationInterpretation:
    """Interpret an ambient audio description into narration text + background music prompt."""
    system_prompt = load_prompt("listen_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("listen_narration_base.md")
    user_prompt = _build_listen_context(audio_description) + "\n\n" + base_prompt + _duration_hint(duration, "narration")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_listen_to_song(
    audio_description: str, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> SongInterpretation:
    """Interpret an ambient audio description into song lyrics + music style tags."""
    system_prompt = load_prompt("listen_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("listen_song_base.md")
    user_prompt = _build_listen_context(audio_description) + "\n\n" + base_prompt + _duration_hint(duration, "song")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=SongInterpretation,
    )
    return response.choices[0].message.parsed


# --- Move mode interpretation functions ---


def _build_move_context(motion_summary: str) -> str:
    return f"\nMotion Analysis:\n{motion_summary}\n"


async def interpret_move_to_music_prompt(
    motion_summary: str, duration: int = 30, style_prompts: dict | None = None
) -> WeatherInterpretation:
    """Interpret a motion analysis summary into an instrumental music prompt."""
    system_prompt = load_prompt("move_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("move_music_base.md").replace("{duration}", str(duration))
    user_prompt = _build_move_context(motion_summary) + "\n\n" + base_prompt

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=WeatherInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_move_to_narration(
    motion_summary: str, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> NarrationInterpretation:
    """Interpret a motion analysis summary into narration text + background music prompt."""
    system_prompt = load_prompt("move_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("move_narration_base.md")
    user_prompt = _build_move_context(motion_summary) + "\n\n" + base_prompt + _duration_hint(duration, "narration")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_move_to_song(
    motion_summary: str, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> SongInterpretation:
    """Interpret a motion analysis summary into song lyrics + music style tags."""
    system_prompt = load_prompt("move_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("move_song_base.md")
    user_prompt = _build_move_context(motion_summary) + "\n\n" + base_prompt + _duration_hint(duration, "song")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=SongInterpretation,
    )
    return response.choices[0].message.parsed
