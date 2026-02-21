from typing import Optional, Tuple

import requests


def location_text_to_latlon(location_text: str) -> Optional[Tuple[float, float]]:
    """
    Convert a human-readable location description to latitude and longitude
    using the Nominatim (OpenStreetMap) geocoding API. No API key required.

    Args:
        location_text: e.g., "Taipei 101", "Golden Gate Bridge"

    Returns:
        (lat, lon) tuple or None if not found.
    """
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": location_text, "format": "json", "limit": 1},
        headers={"User-Agent": "MomentMusic/0.1"},
    )

    if response.status_code != 200:
        raise RuntimeError(f"Geocoding failed: {response.status_code}, {response.text}")

    results = response.json()
    if results:
        return float(results[0]["lat"]), float(results[0]["lon"])

    return None
