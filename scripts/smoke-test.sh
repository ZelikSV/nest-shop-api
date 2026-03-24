#!/usr/bin/env bash
# smoke-test.sh — wait for the API health endpoint, then verify HTTP 200.
# Usage: ./scripts/smoke-test.sh <port> [max_attempts] [sleep_seconds]
# Example: ./scripts/smoke-test.sh 8081 20 5

set -euo pipefail

PORT="${1:-8081}"
MAX_ATTEMPTS="${2:-20}"
SLEEP_SEC="${3:-5}"
URL="http://localhost:${PORT}/api"

echo "Smoke test: waiting for ${URL} (max $((MAX_ATTEMPTS * SLEEP_SEC))s)..."

for i in $(seq 1 "${MAX_ATTEMPTS}"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}" 2>/dev/null || echo "000")
  if [ "${STATUS}" = "200" ]; then
    echo "✓ Smoke test passed — HTTP ${STATUS} after $((i * SLEEP_SEC))s"
    exit 0
  fi
  echo "  attempt ${i}/${MAX_ATTEMPTS} — HTTP ${STATUS}, sleeping ${SLEEP_SEC}s..."
  sleep "${SLEEP_SEC}"
done

echo "✗ Smoke test failed — API did not respond with 200 within $((MAX_ATTEMPTS * SLEEP_SEC))s"
exit 1
