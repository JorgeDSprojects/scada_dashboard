#!/usr/bin/env bash
set -euo pipefail

frontend_port="${FRONTEND_PORT:-5173}"

docker compose ps

if command -v curl >/dev/null 2>&1; then
  echo
  echo "[status] Frontend HTTP probe"
  curl --silent --show-error --fail "http://localhost:${frontend_port}/" >/dev/null
  echo "[status] Frontend is reachable on port ${frontend_port}."

  echo "[status] Backend API probe via frontend proxy"
  curl --silent --show-error --fail "http://localhost:${frontend_port}/api/dashboards" >/dev/null
  echo "[status] API proxy is reachable."
else
  echo "[status] curl not found. Skipping HTTP probes."
fi
