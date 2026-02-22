#!/bin/bash

# Run the backend server only
# API server: http://localhost:8000

cd "$(dirname "$0")/backend"

echo "Starting backend on http://localhost:8000..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --loop asyncio
