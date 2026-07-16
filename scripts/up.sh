#!/usr/bin/env bash
set -euo pipefail

build="false"
detach="false"
reset="false"

usage() {
  echo "Usage: ./scripts/up.sh [--build] [--detach] [--reset]"
}

for arg in "$@"; do
  case "$arg" in
    --build)
      build="true"
      ;;
    --detach)
      detach="true"
      ;;
    --reset)
      reset="true"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$reset" == "true" ]]; then
  echo "[up] Reset requested: seeding historian data from scratch."
  docker compose up -d postgres

  reset_cmd=(docker compose run --rm)
  if [[ "$build" == "true" ]]; then
    reset_cmd+=(--build)
  fi
  reset_cmd+=(backend python -m app.historian.seed --reset)
  "${reset_cmd[@]}"
fi

cmd=(docker compose up)
if [[ "$build" == "true" ]]; then
  cmd+=(--build)
fi
if [[ "$detach" == "true" ]]; then
  cmd+=(-d)
fi

echo "[up] Starting stack: ${cmd[*]}"
"${cmd[@]}"

if [[ "$detach" == "true" ]]; then
  ./scripts/status.sh
fi
