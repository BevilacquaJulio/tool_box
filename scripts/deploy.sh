#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly BRANCH="main"
readonly EXPECTED_SHA="${1:-}"

cd "$APP_DIR"

if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "Deploy aborted: expected branch '$BRANCH'." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Deploy aborted: the VPS checkout has tracked local changes." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Deploy aborted: $APP_DIR/.env does not exist." >&2
  exit 1
fi

git fetch --prune origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"

readonly ACTUAL_SHA="$(git rev-parse HEAD)"
if [[ -n "$EXPECTED_SHA" && "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
  echo "Deploy aborted: checked out $ACTUAL_SHA, expected $EXPECTED_SHA." >&2
  exit 1
fi

docker compose config --quiet
docker compose up -d --build --remove-orphans --wait --wait-timeout 180
docker compose ps

readonly DOMAIN="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1 | tr -d '\r')"
if [[ -z "$DOMAIN" ]]; then
  echo "Deploy aborted: DOMAIN is missing from .env." >&2
  exit 1
fi

readonly HEALTH_RESPONSE="$(
  curl \
    --fail \
    --silent \
    --show-error \
    --retry 10 \
    --retry-all-errors \
    --retry-delay 3 \
    "https://$DOMAIN/api/health"
)"

if [[ "$HEALTH_RESPONSE" != *'"status":"ok"'* ]]; then
  echo "Deploy failed: unexpected health response: $HEALTH_RESPONSE" >&2
  exit 1
fi

echo "Deploy completed successfully: $ACTUAL_SHA"
