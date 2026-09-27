#!/usr/bin/env bash
# run_local.sh - One-command local runner for Yojana Sathi (Docker-free fallback)
set -e

echo "Starting Yojana Sathi Services..."

# Start Eligibility Service
(cd services/eligibility && uvicorn main:app --host 127.0.0.1 --port 8001) &
PID_ELIG=$!

# Start Document Service
(cd services/document && uvicorn main:app --host 127.0.0.1 --port 8002) &
PID_DOC=$!

# Start Gateway Service
(cd services/gateway && uvicorn main:app --host 127.0.0.1 --port 8000) &
PID_GATE=$!

# Start Frontend
(cd frontend && npm run dev) &
PID_FRONT=$!

echo "Services started:"
echo "Frontend:    http://localhost:5173"
echo "Gateway:     http://localhost:8000/health"
echo "Eligibility: http://localhost:8001/health"
echo "Document:    http://localhost:8002/health"

trap "kill $PID_ELIG $PID_DOC $PID_GATE $PID_FRONT" EXIT
wait
