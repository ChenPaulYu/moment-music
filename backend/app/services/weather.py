import requests

# WMO weather code descriptions
_WMO_CODES = {
    0: ("Clear", "clear sky"),
    1: ("Clear", "mainly clear"),
    2: ("Clouds", "partly cloudy"),
    3: ("Clouds", "overcast"),
    45: ("Fog", "fog"),
    48: ("Fog", "depositing rime fog"),
    51: ("Drizzle", "light drizzle"),
    53: ("Drizzle", "moderate drizzle"),
    55: ("Drizzle", "dense drizzle"),
    61: ("Rain", "slight rain"),
    63: ("Rain", "moderate rain"),
    65: ("Rain", "heavy rain"),
    66: ("Rain", "light freezing rain"),
    67: ("Rain", "heavy freezing rain"),
    71: ("Snow", "slight snow"),
    73: ("Snow", "moderate snow"),
    75: ("Snow", "heavy snow"),
    77: ("Snow", "snow grains"),
    80: ("Rain", "slight rain showers"),
    81: ("Rain", "moderate rain showers"),
    82: ("Rain", "violent rain showers"),
    85: ("Snow", "slight snow showers"),
    86: ("Snow", "heavy snow showers"),
    95: ("Thunderstorm", "thunderstorm"),
    96: ("Thunderstorm", "thunderstorm with slight hail"),
    99: ("Thunderstorm", "thunderstorm with heavy hail"),
}


def get_weather_by_lat_lon(lat: float, lon: float) -> dict | None:
    """
    Fetch current weather using the Open-Meteo API. No API key required.

    Returns dict matching the format expected by prompt_generation:
        { city, temperature, humidity, weather_main, weather_desc, wind_speed }
    """
    response = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        },
    )

    if not response.ok:
        return None

    data = response.json()
    current = data.get("current", {})
    code = current.get("weather_code", 0)
    weather_main, weather_desc = _WMO_CODES.get(code, ("Unknown", "unknown"))

    return {
        "city": None,  # Open-Meteo doesn't return city; router fills this in
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "weather_main": weather_main,
        "weather_desc": weather_desc,
        "wind_speed": current.get("wind_speed_10m"),
    }
