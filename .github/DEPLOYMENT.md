# CI/CD do bl_toolbox

O workflow `workflows/ci-cd.yml` executa o CI em pull requests e pushes para
`main`. O deploy na VPS acontece somente em pushes para `main`, depois que o
backend, o frontend e o smoke test Docker passam.

## Onde ficam os valores sensíveis

| Onde | O que guardar |
| --- | --- |
| `.env` na VPS | `DOMAIN`, `INTERNAL_API_KEY`, limites de runtime — usado pelo Docker Compose |
| GitHub Secrets | host SSH, usuário, chave, caminho do checkout na VPS |
| Repositório | apenas nomes genéricos de variáveis; nunca valores reais |

O GitHub Actions **não lê** o `.env` da sua máquina nem o da VPS. O runner roda
na nuvem do GitHub e precisa dos secrets para conectar via SSH. Na VPS, o
`scripts/deploy.sh` usa o `.env` local para validar o deploy (`DOMAIN`, etc.).

## Secrets do GitHub

Configure em **Settings > Secrets and variables > Actions**:

- `VPS_HOST`: host ou IP usado na conexão SSH;
- `VPS_PORT`: porta SSH (opcional; o padrão é `22`);
- `VPS_USER`: usuário SSH com permissão de deploy;
- `VPS_APP_DIR`: caminho absoluto do checkout na VPS;
- `VPS_SSH_KEY`: chave privada exclusiva do GitHub Actions;
- `VPS_KNOWN_HOSTS`: linha da chave pública do host SSH já confiada.

Para obter `VPS_KNOWN_HOSTS` de uma máquina que já confia na VPS:

```bash
ssh-keygen -F HOST -f ~/.ssh/known_hosts
```

Se a porta não for 22, consulte usando `[HOST]:PORT`. Copie para o secret apenas
a linha da chave, sem a linha de comentário iniciada por `#`.

## Deploy

Na VPS:

1. Clone o repositório no diretório indicado em `VPS_APP_DIR`.
2. Crie o `.env` de produção nesse diretório (nunca commite).
3. Garanta que o usuário SSH usado pelo Actions consiga executar `docker compose`.

O script `scripts/deploy.sh` descobre o diretório do app pela própria
localização do script, recusa deploy com alterações locais em arquivos
versionados, atualiza `main` apenas por fast-forward, valida o Compose, aguarda
os containers ficarem saudáveis e confere `https://${DOMAIN}/api/health`.
