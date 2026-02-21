from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.geocoding import location_text_to_latlon
from app.services.weather import get_weather_by_lat_lon
from app.services.prompt_generation import interpret_weather_to_music_prompt
from app.services.audio_generation import text2audio

router = APIRouter()


class GenerateRequest(BaseModel):
    location: str


@router.post("/generate")
async def generate(req: GenerateRequest):
    try:
        # 1. Geocode location text → lat/lon
        latlon = location_text_to_latlon(req.location)
        if not latlon:
            return JSONResponse(
                status_code=400,
                content={"error": f"Could not geocode location: {req.location}"},
            )
        lat, lon = latlon

        # 2. Fetch weather data (Open-Meteo doesn't return city name)
        weather = get_weather_by_lat_lon(lat, lon)
        if not weather:
            return JSONResponse(
                status_code=502,
                content={"error": "Failed to fetch weather data"},
            )

        weather["city"] = req.location

        # 3. Interpret weather → music prompt via LLM
        interpretation = await interpret_weather_to_music_prompt(weather)

        # 4. Generate instrumental audio via Stable Audio
        duration = min(20, 180)  # default 20s
        text2audio(
            prompt=interpretation.suggested_prompt,
            duration=duration,
            filename="generated_music.mp3",
        )

        # 5. Return response
        return {
            "location": f"{lat:.4f}, {lon:.4f}",
            "weather_summary": f"{weather['city']} | {weather['temperature']}C | {weather['weather_desc']}",
            "mood_keywords": interpretation.mood_keywords,
            "summary": interpretation.summary,
            "prompt": interpretation.suggested_prompt,
            "audio_url": "/audio/generated_music.mp3",
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
