#!/usr/bin/env bash
# deploy.sh — publica um SHA de um projeto na VPS (chamado pelo CD/Rollback via SSH forced command).
#
# ADAPTE AS 3 CONSTANTES DE CONFIGURAÇÃO ABAIXO AO COPIAR PARA UM PROJETO NOVO:
#   - APPS_ROOT         (ex.: /home/juliobevi/htdocs/bevilabs)
#   - ALLOWED_PROJECT   (ex.: bl_meu_app)
#   - GHCR_IMAGE_PREFIX (ex.: ghcr.io/seu-usuario/seu-repo — sempre em minúsculas)
#
# Instalação (uma vez, na VPS, como root/sudo):
#   sudo install -o root -g root -m 755 deploy.sh /home/deploy/bin/deploy-<slug>.sh
#
# Chave exclusiva do CI no /home/deploy/.ssh/authorized_keys:
#   command="/home/deploy/bin/deploy-<slug>.sh <projeto>",restrict ssh-ed25519 AAAA... gha-deploy-<projeto>
#
# O CI envia "deploy <sha40> [--backup]" em SSH_ORIGINAL_COMMAND.
# Para operação local na VPS como deploy:
#   /home/deploy/bin/deploy-<slug>.sh <projeto> status
#   /home/deploy/bin/deploy-<slug>.sh <projeto> deploy <sha40> [--backup]
#
# Saída vai para o log do GitHub Actions (público em repo público):
# nunca imprima variáveis de ambiente nem logs da aplicação aqui.

set -Eeuo pipefail
umask 027

# ── Configuração específica do projeto (ajuste estas 3 linhas) ──
readonly APPS_ROOT="/home/juliobevi/htdocs/bevilabs"
readonly ALLOWED_PROJECT="bl_toolbox"
readonly GHCR_IMAGE_PREFIX="ghcr.io/bevilacquajulio/tool_box"

readonly WAIT_TIMEOUT=180
readonly LOCK_WAIT=600

log() { printf '[deploy %s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERRO: $*"; exit 1; }

project="${1:-}"
[[ "$project" == "$ALLOWED_PROJECT" ]] || die "este executor atende somente $ALLOWED_PROJECT"
project_dir="$APPS_ROOT/$project"
[[ -d "$project_dir" ]] || die "diretório $project_dir não existe"
cd "$project_dir"

compose_file=""
for candidate in compose.yml compose.yaml docker-compose.yml docker-compose.yaml; do
  if [[ -f "$candidate" ]]; then compose_file="$candidate"; break; fi
done
[[ -n "$compose_file" ]] || die "nenhum arquivo compose em $project_dir"

dc() { docker compose -f "$compose_file" "$@"; }

current_tag() {
  [[ -f .env ]] || return 0
  sed -n 's/^IMAGE_TAG=\([0-9a-f]\{40\}\)$/\1/p' .env | tail -n 1
}

set_tag() {
  local sha=$1 tmp
  tmp="$(mktemp .env.XXXXXX)"
  if [[ -f .env ]]; then
    grep -v '^IMAGE_TAG=' .env > "$tmp" || true
  fi
  if [[ -n "$sha" ]]; then printf 'IMAGE_TAG=%s\n' "$sha" >> "$tmp"; fi
  chmod 600 "$tmp"
  mv -f "$tmp" .env
}

# Remove imagens antigas do GHCR somente deste projeto, mantendo a atual e a anterior (para rollback).
cleanup_images() {
  local keep_a=$1 keep_b=${2:-} repo ref tag
  while read -r repo; do
    [[ -n "$repo" ]] || continue
    case "$repo" in
      "${GHCR_IMAGE_PREFIX}/api"|"${GHCR_IMAGE_PREFIX}/migrate"|"${GHCR_IMAGE_PREFIX}/web") ;;
      *) continue ;;
    esac
    while read -r ref; do
      tag="${ref##*:}"
      [[ "$tag" == "$keep_a" || ( -n "$keep_b" && "$tag" == "$keep_b" ) ]] && continue
      docker image rm "$ref" > /dev/null 2>&1 || true
    done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "$repo")
  done < <(IMAGE_TAG="$keep_a" dc --profile migrate config --images | grep '^ghcr\.io/' | sed 's/:[^:/]*$//' | sort -u)
}

record() { printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" >> .deploy-history; }

cmd_status() {
  log "projeto=$project IMAGE_TAG no ar=$(current_tag)"
  dc ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}' || true
}

cmd_deploy() {
  local sha=$1 backup=$2 previous
  previous="$(current_tag)"
  log "projeto=$project novo=$sha anterior=${previous:-nenhum} backup=$backup"

  if [[ "$backup" == "yes" && ! -x hooks/pre-migrate.sh ]]; then
    die "deploy com migration nova exige hooks/pre-migrate.sh executável (backup). Nada foi alterado."
  fi

  export IMAGE_TAG="$sha"

  log "baixando imagens"
  dc --profile migrate pull --quiet || die "falha no pull — as imagens deste SHA existem no GHCR e o pacote está acessível?"

  if [[ "$backup" == "yes" ]]; then
    log "backup do banco antes da migration"
    hooks/pre-migrate.sh "$project_dir" "$sha" || die "backup falhou — deploy abortado, versão anterior segue no ar"
  fi

  local services
  services="$(dc --profile migrate config --services)" || die "docker compose config falhou — confira o compose e os env_file. Nada foi alterado."
  # grep sobre a variável (não em pipe) para evitar SIGPIPE (141) sob pipefail.
  if grep -qx migrate <<< "$services"; then
    log "aplicando migrations (sem pendências = nada a fazer)"
    dc run --rm -T migrate || die "migration falhou — a versão anterior segue no ar. MySQL não desfaz DDL parcial: confira com 'prisma migrate status' antes de tentar de novo"
  else
    [[ "$backup" == "no" ]] || die "deploy com --backup, mas o compose não tem serviço migrate. Nada foi alterado."
    log "compose sem serviço migrate: etapa de migration pulada"
  fi

  log "subindo a nova versão e aguardando healthcheck"
  set_tag "$sha"
  if dc up -d --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
    record "$sha" ok
    cleanup_images "$sha" "$previous"
    log "deploy concluído: $sha"
    dc ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}' || true
    return 0
  fi

  log "a nova versão não ficou saudável em ${WAIT_TIMEOUT}s"
  dc ps --format 'table {{.Name}}\t{{.Image}}\t{{.Status}}' || true
  record "$sha" failed

  if [[ -n "$previous" && "$previous" != "$sha" ]]; then
    log "rollback automático para $previous"
    set_tag "$previous"
    export IMAGE_TAG="$previous"
    if dc up -d --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
      record "$previous" rollback-ok
      log "rollback concluído — $previous está no ar"
    else
      record "$previous" rollback-failed
      log "ATENÇÃO: o rollback também não ficou saudável — intervenção manual necessária"
    fi
  else
    set_tag "$previous"
    log "sem versão anterior registrada para rollback"
  fi
  die "deploy de $sha falhou (logs da aplicação: 'docker compose logs' na VPS)"
}

# Forced command: comando vem em SSH_ORIGINAL_COMMAND. Operação local: vem nos argumentos.
if [[ -n "${SSH_ORIGINAL_COMMAND:-}" ]]; then
  read -r -a args <<< "$SSH_ORIGINAL_COMMAND"
else
  args=("${@:2}")
fi
action="${args[0]:-}"

case "$action" in
  status)
    (( ${#args[@]} == 1 )) || die "uso: status"
    cmd_status
    ;;
  deploy)
    sha="${args[1]:-}"
    [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die "SHA inválido (esperado: 40 caracteres hexadecimais)"
    backup="no"
    case "${args[2]:-}" in
      "") ;;
      --backup) backup="yes" ;;
      *) die "argumento não permitido: ${args[2]}" ;;
    esac
    (( ${#args[@]} <= 3 )) || die "argumentos demais"

    exec 9> "$project_dir/.deploy.lock"
    flock -w "$LOCK_WAIT" 9 || die "outro deploy em andamento há mais de ${LOCK_WAIT}s"
    cmd_deploy "$sha" "$backup"
    ;;
  *)
    die "comando não permitido"
    ;;
esac
