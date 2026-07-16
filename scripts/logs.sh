#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "Usage: ./scripts/logs.sh [service]" >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  docker compose logs -f "$1"
else
  docker compose logs -f
fi
