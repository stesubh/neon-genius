#!/usr/bin/env bash
# Starts Neon Genius on http://localhost:8000 (or the port you pass: ./start.sh 8080)
cd "$(dirname "$0")"
PORT=${1:-8000}
# stop an older copy of the server on this port, if one is running
OLD=$(lsof -ti tcp:"$PORT" 2>/dev/null); [ -n "$OLD" ] && kill $OLD 2>/dev/null && sleep 0.5
( sleep 1; xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true ) &
python3 serve.py "$PORT"
