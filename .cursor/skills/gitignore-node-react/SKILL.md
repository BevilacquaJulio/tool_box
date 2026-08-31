---
name: gitignore-node-react
description: >-
  Gerar ou corrigir o .gitignore de um projeto Node + React (NestJS/Express +
  Vite, Prisma, Docker, Traefik). Use quando pedirem um gitignore, ao iniciar um
  projeto novo, ou quando o repositório estiver sujo (arquivo gerado versionado,
  segredo exposto). Pareia com backend-nestjs-rules, frontend-react-rules e
  docker-compose-rules.
argument-hint: "[caminho do projeto]"
metadata:
  version: "1.0.0"
---

# .gitignore para Node + React

Gera um `.gitignore` **sob medida para o projeto que está na sua frente** — não um
template genérico colado. Um `.gitignore` copiado de outro projeto é a causa mais
comum de dois problemas opostos: segredo vazando para o repositório, e arquivo
importante desaparecendo sem ninguém perceber.

O processo tem três etapas obrigatórias: **detectar → gerar → verificar**. Não pule
a terceira.

---

## Etapa 1 — Detectar

Nunca assuma a estrutura. Rode estes comandos e leia o resultado antes de escrever
qualquer linha:

```bash
# forma do projeto
ls -a
cat package.json 2>/dev/null | head -40
ls backend frontend apps packages 2>/dev/null

# o que já existe no disco e não deveria ser versionado
find . -maxdepth 3 \( -name "node_modules" -o -name "dist" -o -name "build" \
  -o -name ".env" -o -name "Desktop.ini" -o -name "*.log" -o -name "coverage" \
  -o -name ".venv" -o -name "uploads" -o -name "storage" -o -name "sql" \) \
  -not -path "*/node_modules/*" 2>/dev/null

# ONDE o Prisma gera o client — isso muda o gitignore (ver armadilha 2)
grep -A3 "generator" prisma/schema.prisma */prisma/schema.prisma 2>/dev/null

# o que JÁ está versionado e não deveria estar
git ls-files 2>/dev/null | grep -Ei '(^|/)(\.env|Desktop\.ini|Thumbs\.db|\.DS_Store|node_modules/|dist/|build/|coverage/|__pycache__|\.venv/|\.log$|\.sqlite$|\.bak$)'

# e no histórico, mesmo que já tenham removido
git log --all --pretty=format: --name-only 2>/dev/null | sort -u | grep -E '(^|/)\.env$'
```

Responda mentalmente: é monorepo (`backend/` + `frontend/`) ou pacote único? Usa
Prisma? Docker? Recebe upload de arquivo? Guarda dump de banco? Roda em Windows?

---

## Etapa 2 — Gerar

Comece pelo bloco base e **acrescente só os blocos que a detecção justificar**.
Uma seção que não corresponde a nada real no projeto é ruído que envelhece mal.

Coloque **um `.gitignore` na raiz**, mesmo em monorepo. Arquivos por pacote
(`backend/.gitignore`, `frontend/.gitignore`) repetindo as mesmas regras só criam
duas fontes de verdade que divergem com o tempo. Só use um arquivo local quando a
regra for genuinamente exclusiva daquele pacote.

### Base — sempre

```gitignore
# =============================================================================
# <NOME DO PROJETO> — .gitignore
# <stack detectada: ex. NestJS + Prisma · React + Vite · Docker>
# =============================================================================

# --- Segredos ---------------------------------------------------------------
# As duas linhas são necessárias: `.env.*` NÃO casa com `.env`.
.env
.env.*
!.env.example
!.env.*.example

# --- Dependências -----------------------------------------------------------
node_modules/

# --- Build ------------------------------------------------------------------
dist/
dist-ssr/
build/
*.tsbuildinfo

# --- Cache ------------------------------------------------------------------
.vite/
.cache/
*.local

# --- Logs -------------------------------------------------------------------
*.log
logs/
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# --- Testes -----------------------------------------------------------------
coverage/
.vitest-cache/

# --- Sistema operacional ----------------------------------------------------
Desktop.ini
Thumbs.db
ehthumbs.db
$RECYCLE.BIN/
.DS_Store
._*
*~

# --- Editores ---------------------------------------------------------------
.idea/
*.iml
.vscode/*
!.vscode/extensions.json
*.swp
*.swo
*.bak
*.orig
```

### Prisma — só se houver `schema.prisma`

Leia o `output` do bloco `generator` e ignore **esse caminho**, não um chute:

```gitignore
# --- Prisma -----------------------------------------------------------------
# Client gerado — recriado por `prisma generate`.
# Ajuste conforme o `output` do generator no schema.prisma.
generated/
backend/generated/
```

Se o `output` apontar para dentro de `node_modules` (padrão), **não acrescente
nada** — já está coberto.

### Docker — só se houver `Dockerfile` ou `docker-compose.yml`

```gitignore
# --- Docker -----------------------------------------------------------------
docker-compose.override.yml
secrets/
*.pid
```

### Banco de dados — só se houver dumps ou SQLite

```gitignore
# --- Banco de dados ---------------------------------------------------------
# Dump contém dado real de usuário. Nunca versionar.
*.sql.gz
*.dump
*.sqlite
*.sqlite3
*.db
*.db-journal
sql/dumps/
sql/backups/
```

Cuidado com `sql/` inteiro: muitos projetos guardam ali o DDL e as migrações, que
**devem** ser versionados. Ignore as subpastas de dump, não a pasta toda — a menos
que a detecção mostre que ali só há dump.

### Uploads e mídia — só se a pasta existir

Use o padrão "ignora o conteúdo, mantém a pasta", senão o app quebra em máquina
nova porque o diretório não existe:

```gitignore
# --- Uploads ----------------------------------------------------------------
uploads/*
!uploads/.gitkeep
storage/*
!storage/.gitkeep
```

E crie o `.gitkeep`: `touch uploads/.gitkeep`.

---

## Etapa 3 — Verificar

Sem esta etapa você entregou um arquivo, não uma solução.

```bash
# 1. O .gitignore NÃO desversiona o que já está versionado.
#    Se a detecção achou lixo em `git ls-files`, é preciso remover do índice:
git rm -r --cached node_modules dist .env 2>/dev/null   # ajuste ao caso real
#    Isso NÃO apaga do disco. Requer commit.
#    Se um .env já foi commitado, trocar o segredo é obrigatório — remover do
#    índice não o tira do histórico.

# 2. Nenhum arquivo importante foi ignorado por engano
git status --porcelain --ignored | grep '^!!' | head -40

# 3. Por que um caminho específico está sendo ignorado (mostra a regra e a linha)
git check-ignore -v src/config.ts prisma/schema.prisma .env.example

# 4. Confirme que estes CONTINUAM versionados
git check-ignore -v package-lock.json .env.example && echo "ERRO: não deveria ser ignorado"
```

Ao final, informe em uma linha o que foi removido do índice e o que exige ação
humana (trocar segredo exposto, criar `.gitkeep`).

---

## Armadilhas — cada uma já quebrou um projeto real

**1. Lock file não se ignora.** `package-lock.json`, `pnpm-lock.yaml` e
`yarn.lock` **devem** ser versionados: são o que garante build reproduzível.
Vê-los em `git ls-files` é sinal de que está certo, não de sujeira.

**2. O caminho do client do Prisma varia por projeto.** Com
`output = "../generated/prisma"` é preciso ignorar `generated/`; com o padrão
(dentro de `node_modules`) não é preciso nada. Um `.gitignore` fixo erra em um dos
dois casos. Leia o `schema.prisma`.

**3. Não ignore em bloco a configuração de agente de IA.** Regras como
`**/SKILL.md`, `**/skills/`, `.cursor/`, `**/.claude` parecem inofensivas, mas em
projetos onde esses arquivos são a **especificação funcional** versionada de
propósito, eles desaparecem silenciosamente. Antes de ignorar `.cursor/` ou
`.claude/`, rode `git ls-files | grep -E '\.cursor|\.claude|SKILL'`. Se houver
resultado, esses arquivos são documentação — mantenha.

**4. `.env.*` não cobre `.env`.** São padrões diferentes. Precisa das duas linhas.
E a negação `!.env.example` tem que vir **depois** das regras de ignore, ou não
tem efeito.

**5. `.gitignore` não desversiona nada.** Arquivo já rastreado continua sendo
rastreado para sempre, por mais específica que seja a regra. Só `git rm --cached`
resolve.

**6. Ignorar a pasta impede a negação de funcionar.** `uploads/` seguido de
`!uploads/.gitkeep` **não funciona**: o git não entra em diretório excluído.
Use `uploads/*` (com a barra e o asterisco).

**7. Windows cria `Desktop.ini` sozinho**, especialmente em pastas sincronizadas
com OneDrive. Se o projeto roda em Windows, essa linha nunca é opcional.

---

## Formato da entrega

Escreva o `.gitignore` com cabeçalho identificando projeto e stack, seções
separadas por comentário, e **um comentário curto explicando o porquê** onde a
regra não for óbvia (dumps, uploads, client gerado). Um `.gitignore` sem
explicação vira, seis meses depois, um arquivo que ninguém ousa mexer.

Não inclua seções para tecnologias que o projeto não usa.
