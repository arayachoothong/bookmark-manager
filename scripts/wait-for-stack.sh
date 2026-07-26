#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:4000/me}"
WEB_URL="${WEB_URL:-http://localhost:3000/}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-120}"
COMPOSE="docker compose"

deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

echo "Waiting for migrate to complete successfully..."
while true; do
  status="$($COMPOSE ps -a --format '{{.Service}} {{.Status}}' | awk '$1=="migrate" {print substr($0, index($0,$2))}')"
  case "$status" in
    *Exited\ \(0\)*|*exited\ \(0\)*)
      echo "migrate: $status"
      break
      ;;
    *Exited*|*exited*)
      echo "migrate failed: $status" >&2
      $COMPOSE logs migrate >&2 || true
      exit 1
      ;;
  esac
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for migrate" >&2
    $COMPOSE logs migrate >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Waiting for API $API_URL → 401..."
while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL" || true)"
  if [ "$code" = "401" ]; then
    echo "API ready (HTTP $code)"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for API (last HTTP $code)" >&2
    $COMPOSE logs api >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Waiting for web $WEB_URL → 200..."
while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$WEB_URL" || true)"
  if [ "$code" = "200" ]; then
    echo "Web ready (HTTP $code)"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for web (last HTTP $code)" >&2
    $COMPOSE logs web >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Stack is ready."
