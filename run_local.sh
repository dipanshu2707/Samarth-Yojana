#!/usr/bin/env bash
# run_local.sh - One-command local runner for Yojana Sathi (Docker-free fallback)
# Now runs the SINGLE unified backend (port 8000) + frontend (port 5173).
set -e

echo "Starting Yojana Sathi (Unified Backend + Frontend)..."

# Start Unified Backend
(cd backend && uvicorn main:app --host 127.0.0.1 --port 8000) &
PID_API=$!

# Start Frontend
(cd frontend && npm run dev) &
PID_FRONT=$!

echo "Services started:"
echo "Frontend:    http://localhost:5173"
echo "Unified API: http://localhost:8000/health"

trap "kill $PID_API $PID_FRONT" EXIT
wait
