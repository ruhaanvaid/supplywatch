#!/bin/bash
# Start SupplyWatch with one command:  ./start.sh
# Starts the backend (port 8000) and the frontend (port 5173) together.
# Press Ctrl+C once to stop both.
cd "$(dirname "$0")"

# First run only: install everything the app needs.
if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv && backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
if [ ! -d frontend/node_modules ]; then
  (cd frontend && npm install --no-audit --no-fund)
fi

# Login cookies are signed with SESSION_SECRET. If you haven't set one, make a
# random one for this run (so you'll need to log in again after a restart).
export SESSION_SECRET="${SESSION_SECRET:-$(python3 -c 'import secrets; print(secrets.token_hex(32))')}"

# Run the backend in the background, and stop it when this script stops.
(cd backend && .venv/bin/uvicorn main:app --port 8000) &
trap 'kill $!' EXIT

echo "SupplyWatch: open http://localhost:5173"
cd frontend && npm run dev
