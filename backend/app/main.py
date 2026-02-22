import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.routers.generate import router as generate_router
from app.routers.listen import router as listen_router
from app.routers.move import router as move_router
from app.routers.write import router as write_router

# Load environment variables from .env
load_dotenv()

app = FastAPI(title="Moment Music API")

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(generate_router, prefix="/api")
app.include_router(listen_router, prefix="/api")
app.include_router(move_router, prefix="/api")
app.include_router(write_router, prefix="/api")

# Audio directory
AUDIO_DIR = Path(__file__).resolve().parent.parent / "audio"

# Images directory
IMAGES_DIR = Path(__file__).resolve().parent.parent / "images"


@app.get("/audio/{filename}")
def serve_audio(filename: str):
    path = AUDIO_DIR / filename
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(str(path), media_type="audio/mpeg")


@app.get("/images/{filename}")
def serve_image(filename: str):
    path = IMAGES_DIR / filename
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(str(path), media_type="image/png")


# --- API Key management ---

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

_KEY_MAP = {
    "openai_api_key": "OPENAI_API_KEY",
    "stability_api_key": "STABILITY_API_KEY",
}


@app.get("/api/settings/keys/status")
def api_keys_status():
    return {
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
        "stability": bool(os.environ.get("STABILITY_API_KEY")),
    }


class SaveKeysRequest(BaseModel):
    openai_api_key: str | None = None
    stability_api_key: str | None = None


@app.post("/api/settings/keys")
def save_api_keys(body: SaveKeysRequest):
    updates: dict[str, str] = {}
    for field, env_var in _KEY_MAP.items():
        value = getattr(body, field)
        if value:
            os.environ[env_var] = value
            updates[env_var] = value

    if updates and ENV_FILE.exists():
        content = ENV_FILE.read_text()
        for env_var, value in updates.items():
            pattern = re.compile(rf'^{re.escape(env_var)}=.*$', re.MULTILINE)
            if pattern.search(content):
                content = pattern.sub(f'{env_var}={value}', content)
            else:
                content = content.rstrip() + f'\n{env_var}={value}\n'
        ENV_FILE.write_text(content)
    elif updates:
        lines = [f'{env_var}={value}' for env_var, value in updates.items()]
        ENV_FILE.write_text('\n'.join(lines) + '\n')

    return {"ok": True}
