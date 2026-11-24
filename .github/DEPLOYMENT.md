# CI/CD do bl_toolbox

Fluxo: **GitHub Actions → GHCR → VPS** (Modelo C). O runner builda as imagens; a VPS só baixa e sobe.
Não há banco próprio, então não existe imagem `migrate`, gate de migration nem backup.

```text
PR ─────────► ci.yml: api (lint, typecheck, testes, e2e, build, audit) · web (testes, build, audit)
              · workflows (pins por SHA, testes do deploy, actionlint, zizmor, shellcheck, compose)
              → ci-ok + pr-title
merge main ─► cd.yml: CI de novo → build api/web → ghcr.io/bevilacquajulio/tool_box/{api,web}:<sha>
              → ssh deploy@VPS "deploy <sha>" (forced command → /home/deploy/bin/deploy-toolbox.sh bl_toolbox)
                 flock → pull → grava IMAGE_TAG → up --wait 180 s → rollback automático se não ficar saudável
              → health público (https://toolbox.bevilabs.com.br/ e /api/health) → registra o deployment
Rollback ───► rollback.yml (manual): republica um SHA já publicado
```

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `.github/workflows/ci.yml`, `cd.yml`, `rollback.yml`, `pr-title.yml` | pipelines |
| `.github/rulesets/main.json` | ruleset da `main` (checks `ci-ok` e `pr-title`, só squash) |
| `deploy/compose.prod.yml` | compose de produção; vira `compose.yml` na VPS |
| `deploy/deploy.sh` | executor instalado na VPS como `/home/deploy/bin/deploy-toolbox.sh` |
| `deploy/.env.example`, `deploy/.env.production.example` | modelos dos `.env` da VPS |
| `scripts/apply-repo-settings.sh`, `scripts/setup-deploy-secrets.sh` | configuração do GitHub (o dono roda) |
| `scripts/*.sh`, `scripts/*.mjs`, `scripts/tests/` | etapas do CD e testes delas |

## `.env` na VPS (pasta `/home/juliobevi/htdocs/bevilabs/bl_toolbox`)

| Arquivo | Quem lê | Conteúdo | Permissão |
| --- | --- | --- | --- |
| `.env` | Compose (interpolação) | `DOMAIN`, `TRAEFIK_*`; `IMAGE_TAG` é gravada pelo executor | `660` na criação; o executor regrava como `deploy 600` |
| `.env.production` | `env_file` da API e do web | `INTERNAL_API_KEY`, timeouts, throttle, `PORT` | `660` |

Criar **sem sudo** e sem CRLF (`sed -i 's/\r$//' .env*`). `NODE_ENV`, `HOST` e `CORS_ORIGIN` são fixados pelo compose.

## Migração do modelo antigo (uma vez, pelo dono)

O modelo antigo fazia `git pull` + build na VPS com uma chave que abre shell. Ordem para trocar sem derrubar o site:

1. **GitHub** (Git Bash, na raiz do repo, `gh auth status` ok):
   ```bash
   APP_URL=https://toolbox.bevilabs.com.br HEALTH_PATH=/api/health bash scripts/apply-repo-settings.sh BevilacquaJulio/tool_box
   bash scripts/setup-deploy-secrets.sh bl_toolbox 2.25.201.84 22 deploy deploy-toolbox.sh
   ```
   Confira o fingerprint com `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` na VPS. Guarde a linha `command="..."` impressa.
2. **VPS** (na pasta do app, como `juliobevi`; sudo só onde indicado):
   ```bash
   cd /home/juliobevi/htdocs/bevilabs/bl_toolbox
   # compose.yml a partir de deploy/compose.prod.yml; .env e .env.production a partir dos exemplos,
   # copiando os valores do .env atual (INTERNAL_API_KEY etc.).
   chmod 660 .env .env.production   # o deploy lê pela ACL; com 600 o primeiro deploy falha
   IMAGE_TAG=0000000000000000000000000000000000000000 docker compose -f compose.yml config --quiet
   sudo install -o root -g root -m 755 deploy.sh /home/deploy/bin/deploy-toolbox.sh
   echo 'command="/home/deploy/bin/deploy-toolbox.sh bl_toolbox",restrict ssh-ed25519 AAAA... gha-deploy-bl_toolbox' \
     | sudo tee -a /home/deploy/.ssh/authorized_keys
   sudo grep -c gha-deploy-bl_toolbox /home/deploy/.ssh/authorized_keys   # tem de dar 1
   ```
   O `compose.yml` tem prioridade sobre o `docker-compose.yml` antigo do clone; o projeto continua `bl_toolbox`.
3. **Primeiro deploy:** PR com `ci-ok` e `pr-title` verdes → squash merge. Os pacotes do GHCR nascem **privados**:
   se o pull falhar, torne `tool_box/api` e `tool_box/web` públicos (GitHub → Packages → Settings) ou faça
   `docker login ghcr.io` na VPS como `deploy` com token `read:packages`, e rode *Actions → CD → Run workflow*.
4. **Limpeza depois do primeiro deploy verde:**
   - apagar a linha antiga `github-actions-deploy` do `/home/deploy/.ssh/authorized_keys` (ela abre shell);
   - apagar os secrets antigos do nível do repositório (`VPS_APP_DIR`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `VPS_HOST`, `VPS_PORT`, `VPS_USER`): os novos ficam nos environments `production` e `production-db`.

## Operar

- Deploy: merge na `main`. Republicar sem mudança: *Actions → CD → Run workflow*.
- Status na VPS (como `deploy`): `/home/deploy/bin/deploy-toolbox.sh bl_toolbox status`.
- Rollback: *Actions → Rollback* com o SHA de um deploy anterior.
- Mudou `deploy/compose.prod.yml` ou um `.env.example`? Copie para a VPS **antes** do merge, compatível com a versão no ar.
