#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PagePilot Local Setup ==="
echo ""

# --- Backend ---
echo "[1/4] Setting up Python backend..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
  python3 -m venv venv
  echo "  Created virtual environment at backend/venv"
fi

if [ -d "venv" ]; then
  source venv/bin/activate
elif [ -d ".venv" ]; then
  source .venv/bin/activate
fi

pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "  Python dependencies installed."

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created .env from .env.example — edit it to set OPENAI_API_KEY."
else
  echo "  .env already exists."
fi

# --- Directories ---
echo ""
echo "[2/4] Creating data directories..."
mkdir -p data/uploads data/chroma_db
echo "  backend/data/uploads and backend/data/chroma_db created."

# --- PostgreSQL ---
echo ""
echo "[3/4] Checking PostgreSQL..."
if command -v psql &>/dev/null; then
  if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw pagepilot; then
    echo "  Database 'pagepilot' already exists."
  else
    echo "  Creating database 'pagepilot'..."
    createdb -U postgres pagepilot 2>/dev/null || echo "  Could not auto-create. Run: createdb -U postgres pagepilot"
  fi
else
  echo "  psql not found. Make sure PostgreSQL is running and database 'pagepilot' exists."
  echo "  Create it with: createdb -U postgres pagepilot"
fi

# --- Frontend ---
echo ""
echo "[4/4] Setting up frontend..."
cd "$ROOT_DIR/frontend"
npm install -q 2>/dev/null || npm install
echo "  Frontend dependencies installed."

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start the app:"
echo "  Terminal 1:  ./scripts/start-backend.sh"
echo "  Terminal 2:  ./scripts/start-frontend.sh"
echo ""
echo "Open http://localhost:5173 in your browser."
