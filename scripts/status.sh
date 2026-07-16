#!/usr/bin/env bash
set -euo pipefail

frontend_port="${FRONTEND_PORT:-5173}"
frontend_url="${SCADA_FRONTEND_URL:-http://localhost:${frontend_port}/}"
api_url="${SCADA_API_HEALTH_URL:-http://localhost:${frontend_port}/api/dashboards}"

wait_mode="false"
timeout_seconds="${STATUS_TIMEOUT_SECONDS:-60}"
initial_delay_seconds="${STATUS_INITIAL_DELAY_SECONDS:-1}"
max_delay_seconds="${STATUS_MAX_DELAY_SECONDS:-8}"

usage() {
  echo "Usage: ./scripts/status.sh [--wait] [--timeout <seconds>]"
}

is_positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait)
      wait_mode="true"
      shift
      ;;
    --timeout)
      if [[ $# -lt 2 ]]; then
        echo "[status] Missing value for --timeout" >&2
        usage >&2
        exit 1
      fi
      timeout_seconds="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[status] Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! is_positive_integer "$timeout_seconds"; then
  echo "[status] --timeout must be a positive integer (seconds)." >&2
  exit 1
fi

if ! is_positive_integer "$initial_delay_seconds"; then
  echo "[status] STATUS_INITIAL_DELAY_SECONDS must be a positive integer." >&2
  exit 1
fi

if ! is_positive_integer "$max_delay_seconds"; then
  echo "[status] STATUS_MAX_DELAY_SECONDS must be a positive integer." >&2
  exit 1
fi

if (( initial_delay_seconds > max_delay_seconds )); then
  max_delay_seconds="$initial_delay_seconds"
fi

probe_http() {
  local label="$1"
  local url="$2"

  echo "[status] ${label}"
  if curl --silent --show-error --fail "$url" >/dev/null; then
    return 0
  fi

  echo "[status] Probe failed: ${url}" >&2
  return 1
}

run_http_probes() {
  if ! command -v curl >/dev/null 2>&1; then
    echo "[status] curl not found. Skipping HTTP probes."
    return 0
  fi

  if ! probe_http "Frontend HTTP probe" "$frontend_url"; then
    return 1
  fi
  echo "[status] Frontend is reachable on ${frontend_url}."

  if ! probe_http "Backend API probe via frontend proxy" "$api_url"; then
    return 1
  fi
  echo "[status] API proxy is reachable."
}

docker compose ps

echo

if [[ "$wait_mode" != "true" ]]; then
  run_http_probes
  exit 0
fi

start_epoch="$(date +%s)"
delay_seconds="$initial_delay_seconds"
attempt="1"

until run_http_probes; do
  now_epoch="$(date +%s)"
  elapsed="$((now_epoch - start_epoch))"

  if (( elapsed >= timeout_seconds )); then
    echo "[status] Readiness timeout after ${elapsed}s (${attempt} attempts)." >&2
    exit 1
  fi

  sleep_seconds="$delay_seconds"
  remaining="$((timeout_seconds - elapsed))"
  if (( sleep_seconds > remaining )); then
    sleep_seconds="$remaining"
  fi
  if (( sleep_seconds < 1 )); then
    sleep_seconds="1"
  fi

  echo "[status] Attempt ${attempt} failed; retrying in ${sleep_seconds}s (elapsed ${elapsed}s/${timeout_seconds}s)."
  sleep "$sleep_seconds"

  if (( delay_seconds < max_delay_seconds )); then
    delay_seconds="$((delay_seconds * 2))"
    if (( delay_seconds > max_delay_seconds )); then
      delay_seconds="$max_delay_seconds"
    fi
  fi

  attempt="$((attempt + 1))"
done

echo "[status] Readiness probes passed after ${attempt} attempt(s)."
