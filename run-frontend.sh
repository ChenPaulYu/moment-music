#!/bin/bash

# Run the frontend dev server only
# Dev server: http://localhost:5173
# Note: API calls will fail without the backend running

cd "$(dirname "$0")/frontend"

echo "Starting frontend on http://localhost:5173..."
npm run dev
