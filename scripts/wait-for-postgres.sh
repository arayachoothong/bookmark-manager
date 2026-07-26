#!/usr/bin/env sh
set -eu

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-60}"
COMPOSE="docker compose"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

echo "Waiting for postgres to accept connections..."
while true; do
  if $COMPOSE exec -T postgres pg_isready -U bookmark -d bookmark >/dev/null 2>&1; then
    echo "Postgres is ready."
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for postgres after ${TIMEOUT_SECONDS}s" >&2
    $COMPOSE ps postgres >&2 || true
    $COMPOSE logs --tail=50 postgres >&2 || true
    exit 1
  fi
  sleep 1
done
