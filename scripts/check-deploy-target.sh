#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_REPOSITORY:?}" "${GITHUB_SHA:?}"
branch="${TARGET_BRANCH:-main}"
head="$(gh api "repos/$GITHUB_REPOSITORY/commits/$branch" --jq .sha)"
if [[ "$head" != "$GITHUB_SHA" ]]; then
  echo "::error::Execução antiga: a $branch avançou para $head. Publique a execução desse commit."
  exit 1
fi
