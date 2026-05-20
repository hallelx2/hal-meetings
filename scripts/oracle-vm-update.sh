#!/usr/bin/env bash
# Hal Agent — pull latest code + rebuild + restart.
# Run on the Oracle VM, in the repo root.

set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --all --quiet
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse origin/main)

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  echo "[update] already at $LOCAL_SHA — nothing to do."
  exit 0
fi

echo "[update] pulling main: $LOCAL_SHA → $REMOTE_SHA"
git checkout main
git pull --ff-only origin main

echo "[update] rebuilding hal-agent"
docker compose -f apps/agent/docker-compose.yml up -d --build

echo "[update] running. Tail logs with:"
echo "  docker compose -f apps/agent/docker-compose.yml logs -f hal-agent"
