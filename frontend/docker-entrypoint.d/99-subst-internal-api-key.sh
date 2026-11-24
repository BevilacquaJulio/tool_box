#!/bin/sh
set -eu

if [ -z "${INTERNAL_API_KEY:-}" ]; then
  echo "INTERNAL_API_KEY is required for the nginx /api proxy." >&2
  exit 1
fi

conf="/etc/nginx/conf.d/default.conf"
tmp="$(mktemp)"
# Aspas simples de propósito: o envsubst recebe o NOME da variável, e só ela é trocada ($host etc. ficam).
# shellcheck disable=SC2016
envsubst '${INTERNAL_API_KEY}' < "$conf" > "$tmp"

# Config vazia ou sem a chave faria o nginx subir sem servir nada: melhor falhar no start.
if ! grep -qF -- "$INTERNAL_API_KEY" "$tmp"; then
  echo "Falha ao gerar a config do nginx com INTERNAL_API_KEY." >&2
  exit 1
fi
mv "$tmp" "$conf"
