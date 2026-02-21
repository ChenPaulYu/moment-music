from pydantic import BaseModel
from pydantic_ai import Agent

from app.utils.helpers import load_prompt


class WeatherInterpretation(BaseModel):
    location: str
    summary: str
    mood_keywords: list[str]
    suggested_prompt: str


async def interpret_weather_to_music_prompt(weather: dict) -> WeatherInterpretation:
    """Interpret weather data into a music generation prompt via LLM."""
    # pydantic-ai auto-reads OPENAI_API_KEY from env
    agent = Agent(
        "openai:gpt-4",
        output_type=WeatherInterpretation,
        instructions=load_prompt("weather_music_system.txt"),
    )

    dynamic_context = f"""
    Location: {weather['city']}
    Temperature: {weather['temperature']} °C
    Weather: {weather['weather_main']} ({weather['weather_desc']})
    Wind Speed: {weather['wind_speed']} m/s
    Humidity: {weather['humidity']}%
    """

    base_prompt = dynamic_context + "\n\n" + load_prompt("weather_music_base.txt")

    result = await agent.run(base_prompt)
    return result.output
