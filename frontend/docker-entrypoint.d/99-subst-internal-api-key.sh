#!/bin/sh
set -eu

if [ -z "${INTERNAL_API_KEY:-}" ]; then
  echo "INTERNAL_API_KEY is required for the nginx /api proxy." >&2
  exit 1
fi

conf="/etc/nginx/conf.d/default.conf"
tmp="$(mktemp)"
sed 's/__INTERNAL_API_KEY__/${INTERNAL_API_KEY}/g' "$conf" | envsubst '${INTERNAL_API_KEY}' > "$tmp"
mv "$tmp" "$conf"
