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
    max_words_song = int(duration * 2 * 2.5)  # 2x duration * 2.5 words/sec
    max_words_narration = int(duration * 2 * 2.5)
    if output_type == "song":
        return (
            f"\n\n## Duration Constraint\n"
            f"Target duration: ~{duration} seconds (acceptable range: {duration}-{duration * 2}s). "
            f"Write lyrics with at most ~{max_words_song} sung words. Keep it concise."
        )
    else:  # narration
        return (
            f"\n\n## Duration Constraint\n"
            f"Target duration: ~{duration} seconds (acceptable range: {duration}-{duration * 2}s). "
            f"Write narration with at most ~{max_words_narration} words when read aloud. Keep it concise."
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


def _build_weather_context(weather: dict) -> str:
    return f"""
    Location: {weather['city']}
    Temperature: {weather['temperature']} °C
    Weather: {weather['weather_main']} ({weather['weather_desc']})
    Wind Speed: {weather['wind_speed']} m/s
    Humidity: {weather['humidity']}%
    """


async def interpret_weather_to_music_prompt(
    weather: dict, duration: int = 30, style_prompts: dict | None = None
) -> WeatherInterpretation:
    """Interpret weather data into an instrumental music prompt."""
    system_prompt = load_prompt("weather_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("weather_music_base.md").replace("{duration}", str(duration))
    user_prompt = _build_weather_context(weather) + "\n\n" + base_prompt

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
    weather: dict, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> NarrationInterpretation:
    """Interpret weather data into narration text + background music prompt."""
    system_prompt = load_prompt("weather_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("weather_narration_base.md")
    user_prompt = _build_weather_context(weather) + "\n\n" + base_prompt + _duration_hint(duration, "narration")

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
    weather: dict, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> SongInterpretation:
    """Interpret weather data into song lyrics + music style tags."""
    system_prompt = load_prompt("weather_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("weather_song_base.md")
    user_prompt = _build_weather_context(weather) + "\n\n" + base_prompt + _duration_hint(duration, "song")

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


def _build_write_context(text: str, image_caption: str | None = None) -> str:
    ctx = f"\nJournal Entry:\n{text}\n"
    if image_caption:
        ctx += f"\nImage Description:\n{image_caption}\n"
    return ctx


async def interpret_write_to_music_prompt(
    text: str, image_caption: str | None = None, duration: int = 30, style_prompts: dict | None = None
) -> WeatherInterpretation:
    """Interpret a journal entry (+ optional image caption) into an instrumental music prompt."""
    system_prompt = load_prompt("write_music_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "music_prompt_style")
    base_prompt = load_prompt("write_music_base.md").replace("{duration}", str(duration))
    user_prompt = _build_write_context(text, image_caption) + "\n\n" + base_prompt

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=WeatherInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_write_to_narration(
    text: str, image_caption: str | None = None, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> NarrationInterpretation:
    """Interpret a journal entry (+ optional image caption) into narration text + background music prompt."""
    system_prompt = load_prompt("write_narration_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "narration_style", "bg_music_style")
    base_prompt = load_prompt("write_narration_base.md")
    user_prompt = _build_write_context(text, image_caption) + "\n\n" + base_prompt + _duration_hint(duration, "narration")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_write_to_song(
    text: str, image_caption: str | None = None, duration: int = 30, style_prompts: dict | None = None, **kwargs
) -> SongInterpretation:
    """Interpret a journal entry (+ optional image caption) into song lyrics + music style tags."""
    system_prompt = load_prompt("write_song_system.md")
    system_prompt = _inject_style(system_prompt, style_prompts, "overall_mood", "lyrics_style")
    base_prompt = load_prompt("write_song_base.md")
    user_prompt = _build_write_context(text, image_caption) + "\n\n" + base_prompt + _duration_hint(duration, "song")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
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
