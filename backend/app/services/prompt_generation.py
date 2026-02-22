from openai import AsyncOpenAI
from pydantic import BaseModel

from app.utils.helpers import load_prompt

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
    return _client


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


async def interpret_weather_to_music_prompt(weather: dict) -> WeatherInterpretation:
    """Interpret weather data into an instrumental music prompt."""
    system_prompt = load_prompt("weather_music_system.txt")
    user_prompt = _build_weather_context(weather) + "\n\n" + load_prompt("weather_music_base.txt")

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
    weather: dict, duration: int = 20
) -> NarrationInterpretation:
    """Interpret weather data into narration text + background music prompt."""
    system_prompt = load_prompt("weather_narration_system.txt")
    # ~130 words per minute at calm reading pace
    words_target = int(duration / 60 * 130)
    base_template = load_prompt("weather_narration_base.txt")
    base_prompt = base_template.replace("{words_target}", str(words_target))
    user_prompt = _build_weather_context(weather) + "\n\n" + base_prompt

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=NarrationInterpretation,
    )
    return response.choices[0].message.parsed


async def interpret_weather_to_song(weather: dict) -> SongInterpretation:
    """Interpret weather data into song lyrics + music style tags."""
    system_prompt = load_prompt("weather_song_system.txt")
    user_prompt = _build_weather_context(weather) + "\n\n" + load_prompt("weather_song_base.txt")

    response = await _get_client().beta.chat.completions.parse(
        model="gpt-5.2",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=SongInterpretation,
    )
    return response.choices[0].message.parsed
