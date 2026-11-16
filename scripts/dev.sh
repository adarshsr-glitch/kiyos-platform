#!/usr/bin/env bash
# One command to run the prototype: `make up`. Safe to re-run at any time.
#
# Why this exists: starting `pnpm dev` again while an old one is still running makes
# Next pick a new port (3001, 3002…). Both servers then share web/.next and corrupt
# each other's build cache (500s for files that no longer exist), and the API rejects
# the new port. This script stops every old copy, clears the cache, and starts one
# API and one web server on fixed ports, waiting until each is healthy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
LOGS="$ROOT/data/logs"
mkdir -p "$LOGS" "$ROOT/data/documents"

stop_old() {
  # Old copies of this project's servers, on any port.
  local pids
  pids="$( { pgrep -f "$ROOT/web/node_modules/.*next" || true; pgrep -f "kiyos-api.*uvicorn main:app" || true; } | sort -u)"
  # Anything else still holding the two ports.
  pids="$pids $(lsof -ti "tcp:$API_PORT" -sTCP:LISTEN 2>/dev/null || true) $(lsof -ti "tcp:$WEB_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  pids="$(echo $pids | tr ' ' '\n' | grep -v '^$' | sort -u || true)"
  if [ -n "$pids" ]; then
    echo "→ Stopping old servers: $(echo $pids | tr '\n' ' ')"
    kill $pids 2>/dev/null || true
    sleep 2
    kill -9 $pids 2>/dev/null || true
  fi
}

wait_for() { # url, name, log
  for _ in $(seq 1 90); do
    if curl -s -o /dev/null --max-time 2 "$1"; then echo "✓ $2 is up"; return 0; fi
    sleep 1
  done
  echo "✗ $2 didn't start. Last lines of $3:"; tail -25 "$3"; exit 1
}

if [ "${1:-}" = "down" ]; then stop_old; echo "✓ Stopped"; exit 0; fi

stop_old

echo "→ Clearing the web build cache"
rm -rf "$ROOT/web/.next"

echo "→ Starting API on :$API_PORT"
(cd "$ROOT/api" && poetry run uvicorn main:app --reload --port "$API_PORT" >"$LOGS/api.log" 2>&1) &
API_PID=$!
wait_for "http://localhost:$API_PORT/health" "API" "$LOGS/api.log"

echo "→ Starting web on :$WEB_PORT (first page load compiles; give it ~20s)"
(cd "$ROOT/web" && NEXT_PUBLIC_API_URL="http://localhost:$API_PORT" pnpm exec next dev -p "$WEB_PORT" >"$LOGS/web.log" 2>&1) &
WEB_PID=$!
wait_for "http://localhost:$WEB_PORT/" "Web" "$LOGS/web.log"

trap 'echo; echo "→ Stopping"; kill $API_PID $WEB_PID 2>/dev/null; stop_old; exit 0' INT TERM
cat <<MSG

  Expert workspace   http://localhost:$WEB_PORT
  Customer portal    http://localhost:$WEB_PORT/portal
  Logs               data/logs/api.log, data/logs/web.log

  Ctrl-C stops both.
MSG
wait
