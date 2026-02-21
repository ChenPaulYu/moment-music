#!/bin/bash

# Run frontend and backend simultaneously
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000

trap 'kill 0' EXIT

cd "$(dirname "$0")"

echo "Starting backend on http://localhost:8000..."
(cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --loop asyncio) &

echo "Starting frontend on http://localhost:5173..."
(cd frontend && npm run dev) &

wait
