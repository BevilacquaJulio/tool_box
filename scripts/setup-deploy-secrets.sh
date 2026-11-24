#!/usr/bin/env bash
# setup-deploy-secrets.sh — cria a chave SSH exclusiva do CI deste projeto e cadastra os secrets no GitHub.
#
# RODE VOCÊ MESMO, no Git Bash da sua máquina. Não peça a um agente de IA: a chave privada passa por este processo.
#
# Uso (na raiz do repositório, depois de rodar apply-repo-settings.sh):
#   bash scripts/setup-deploy-secrets.sh <projeto> <host-ou-ip> [porta=22] [usuario=deploy] [executor=deploy-<slug>.sh]
#
# Exemplo:
#   bash scripts/setup-deploy-secrets.sh bl_meu_app 203.0.113.10 22 deploy deploy-meu-app.sh
#
# O que faz:
#   1. gera uma chave ed25519 nova sem senha numa pasta temporária (apagada automaticamente no fim);
#   2. captura a chave pública da VPS via ssh-keyscan e pede para você conferir o fingerprint;
#   3. cadastra VPS_SSH_KEY, VPS_KNOWN_HOSTS, VPS_HOST, VPS_USER e VPS_PORT
#      nos environments production e production-db;
#   4. imprime a linha pronta para o authorized_keys da VPS, já travada no executor deste projeto.
#
# Requer: Git Bash / Bash, ssh-keygen, ssh-keyscan e gh autenticado com permissão de admin no repositório.

set -euo pipefail

project="${1:-}"
host="${2:-}"
port="${3:-22}"
user="${4:-deploy}"
default_slug="${project#bl_}"
default_slug="${default_slug#cb_}"
default_slug="${default_slug//_/-}"
executor="${5:-deploy-${default_slug}.sh}"

if [[ -z "$project" || -z "$host" ]]; then
  sed -n '2,20p' "$0"
  exit 1
fi
[[ "$project" =~ ^[a-z0-9][a-z0-9_-]{0,63}$ ]] || { echo "Projeto inválido: use minúsculas, números, - e _." >&2; exit 1; }
[[ "$port" =~ ^[0-9]+$ ]] || { echo "Porta inválida." >&2; exit 1; }
[[ "$user" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || { echo "Usuário inválido." >&2; exit 1; }
[[ "$executor" =~ ^[a-z0-9][a-z0-9._-]{0,63}\.sh$ ]] || { echo "Nome do executor inválido (esperado ex.: deploy-meu-app.sh)." >&2; exit 1; }

repo="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
environments=(production production-db)

for env in "${environments[@]}"; do
  gh api "repos/$repo/environments/$env" --silent 2>/dev/null \
    || { echo "Environment '$env' não existe em $repo. Rode apply-repo-settings.sh antes." >&2; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "==> Gerando chave exclusiva do CI para '$project'"
ssh-keygen -q -t ed25519 -N "" -C "gha-deploy-$project" -f "$tmp/key"

echo "==> Capturando a chave pública do servidor $host:$port"
ssh-keyscan -T 10 -p "$port" -t ed25519 "$host" > "$tmp/known_hosts" 2>/dev/null || true
[[ -s "$tmp/known_hosts" ]] || { echo "Não consegui ler a chave do servidor (host/porta corretos? SSH acessível?)." >&2; exit 1; }

echo
echo "Fingerprint recebido pela rede:"
ssh-keygen -lf "$tmp/known_hosts"
echo
echo "Na VPS, rode e compare:  ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub"
read -r -p "Os fingerprints são idênticos? [s/N] " answer
[[ "$answer" =~ ^[sS]$ ]] || { echo "Abortado. Nada foi cadastrado." >&2; exit 1; }

echo "==> Cadastrando secrets em $repo"
for env in "${environments[@]}"; do
  gh secret set VPS_SSH_KEY     --repo "$repo" --env "$env" < "$tmp/key"
  gh secret set VPS_KNOWN_HOSTS --repo "$repo" --env "$env" < "$tmp/known_hosts"
  gh secret set VPS_HOST        --repo "$repo" --env "$env" --body "$host"
  gh secret set VPS_USER        --repo "$repo" --env "$env" --body "$user"
  gh secret set VPS_PORT        --repo "$repo" --env "$env" --body "$port"
  echo "    $env: ok"
done

echo
echo "==> Acrescente esta linha (com sudo tee -a, nunca sobrescreva) em ~$user/.ssh/authorized_keys na VPS:"
echo
printf 'command="/home/%s/bin/%s %s",restrict %s\n' "$user" "$executor" "$project" "$(cat "$tmp/key.pub")"
echo
echo "A chave privada existe agora só nos secrets do GitHub; a cópia local será apagada ao encerrar."
echo "Para rotacionar a chave no futuro: rode este script de novo e substitua a linha antiga no authorized_keys."
