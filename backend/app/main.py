import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.routers.generate import router as generate_router

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

# Mount API router
app.include_router(generate_router, prefix="/api")

# Audio directory
AUDIO_DIR = Path(__file__).resolve().parent.parent / "audio"


@app.get("/audio/{filename}")
def serve_audio(filename: str):
    path = AUDIO_DIR / filename
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(str(path), media_type="audio/mpeg")
