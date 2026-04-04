#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and set OPENAI_API_KEY."
  exit 1
fi

if [ -d "venv" ]; then
  source venv/bin/activate
elif [ -d ".venv" ]; then
  source .venv/bin/activate
fi

echo "Starting PagePilot backend on http://localhost:8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
