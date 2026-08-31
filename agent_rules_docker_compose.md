---
name: docker-compose-rules
description: >-
  Agent rules for containerizing and deploying a Node/React app (NestJS API +
  React/Vite frontend) with Docker Compose behind Traefik on the shared external
  MySQL network. Use when writing Dockerfiles, docker-compose.yml, nginx config,
  or the root .env for deployment, and when reviewing the deploy setup. Pairs
  with backend-nestjs-rules and frontend-react-rules.
---

# Agent Rules — Docker Compose (Node + React + Traefik + MySQL)

> Rules file for an AI agent (Claude Code / Cursor). Follow these guidelines when
> containerizing or deploying this project. They define the team's standard for
> **VPS deployments with Docker Compose, Traefik, and a shared MySQL**. The app
> code follows **backend-nestjs-rules** and **frontend-react-rules**.
>
> This is the canonical, up-to-date version of this rule for Node/React
> projects — matches what's live in production on `g5` and
> `bevilabs_portfolio`, which are the reference implementation.
> `agent/rules/bigcontext_docker_compose_rules.md` is a separate, still-valid
> rule for the Python/FastAPI single-container stack — not a competing
> version of this one, and it still requires underscore-only container names
> for that stack.

## Objective
Ship the NestJS API and the React/Vite frontend as containers behind Traefik,
using the single shared MySQL instance. Reproducible builds, no secrets in the
image, TLS handled by Traefik, production-hardened by default: non-root user,
healthcheck, resource limits, log rotation.

## Target architecture
```
Traefik  (external network: traefik)
│
├── {prefix}_{project}-app   (React/Vite static, nginx)   ->  ${DOMAIN}
├── {prefix}_{project}-api   (NestJS)                      ->  api.${DOMAIN}
│
└── mysql_shared  (external network: mysql_shared)
    ├── mydb
    └── ...other project databases

One-off, never running: {prefix}_{project}-migrate
  -> docker compose run --rm --build migrate
```

## General rules (always follow)
- Use **`docker compose`**, never `docker-compose`.
- Public applications connect to the external **`traefik`** network.
- Applications using MySQL also connect to the external **`mysql_shared`** network.
- Use a single shared MySQL container by default — do not create a dedicated
  MySQL container per project unless explicitly requested.
- Base image pinned to the **currently active Node LTS** — check
  endoflife.date/nodejs at the time of creation. Never copy a version from an
  older project without checking it's still supported (this is how a project
  ends up running an EOL, unpatched Node in production).
- Non-root runtime: `USER node` in the backend's runtime stage.
- `HEALTHCHECK` in every Dockerfile, pointing at a real endpoint (`/api/health`
  for the API, `/` for the static frontend).
- `npm ci` (not `npm install`) in builds — commit `package-lock.json`.
- `.env` is never committed and is in `.dockerignore` and `.gitignore`; keep
  `.env.example` tracked.

## Naming (image / container_name)
- Fixed pattern: **`{prefix}_{project}-{type}`** — used identically for both
  `image` and `container_name` (the two must be the same string, never
  diverge). Example: `image: bl_g5-api` / `container_name: bl_g5-api`.
- `prefix`: `bl` (bevilabs.com.br projects) or `cb` (centralbevi, personal
  systems) — no other prefix, never omit.
- `project`: short lowercase project slug (e.g. `g5`, `portfolio`).
- `type`: the service's role (`api`, `app`, `migrate`, `worker`, ...).
- Traefik router/service label keys use the same identifier (Compose/Traefik
  accept `-` there without issue).
- Never abbreviate or misspell the project name (e.g. "porfolio" for
  "portfolio").
- `image:` is always declared alongside `build:` — never let Compose
  auto-generate a name.

## Shared MySQL rules
- Apps connect using the shared container name, never `localhost`:
  ```env
  MYSQL_HOST=mysql_shared
  MYSQL_PORT=3306
  ```
- The database (`MYSQL_DATABASE`) and user must exist in the shared MySQL
  **before** the first deploy. The app never creates the database.
- Schema/tables come from **Prisma migrations**, applied through the dedicated
  `migrate` service (see below) — never inside the Dockerfile build (the DB is
  unreachable at build time), and never `migrate reset` in production.

## DOMAIN and public URL
- In Docker/production set only **`DOMAIN`** in the root `.env`. The backend
  derives its public URL as `https://` + `DOMAIN`.
- `CORS_ORIGIN` on the API must equal the frontend origin (`https://${DOMAIN}`).
- Do not hardcode the domain in code; resolve it from `DOMAIN`.

## Backend Dockerfile (NestJS, multi-stage)
`prisma generate` runs in the build (rule from backend skill); migrations do NOT.

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1 — build (prisma generate + nest build)
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # "prisma generate && nest build"

# Stage 2 — production runtime
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
```
Backend `.dockerignore`: `node_modules`, `dist`, `generated`, `.env`, `.git`.

Do not copy the Prisma CLI (`node_modules/.bin/prisma`) or CLI-only config
(e.g. `prisma.config.ts`'s TS source deps) into the runtime stage just to run
migrations via `docker compose exec`. Migrations run through the dedicated
`migrate` service instead (uses the `build` stage, which already has the CLI).

## Frontend Dockerfile (React/Vite -> nginx)
`VITE_*` are build-time (baked into the bundle), so they come in as **build
args**, never runtime env.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL     # baked in at build time
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
RUN apk add --no-cache wget
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```
Frontend `.dockerignore`: `node_modules`, `dist`, `.env`, `.git`.

## nginx.conf (SPA fallback + cache)
The `try_files ... /index.html` line prevents 404 on reload of client routes.

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    location / { try_files $uri $uri/ /index.html; }         # SPA fallback

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

## docker-compose.yml (project root)
```yaml
services:
  api:
    image: bl_myapp-api
    build: ./backend
    container_name: bl_myapp-api
    restart: unless-stopped
    env_file:
      - .env
    networks:
      - mysql_shared
      - traefik
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik
      - "traefik.http.routers.bl_myapp-api.rule=Host(`api.${DOMAIN}`)"
      - traefik.http.routers.bl_myapp-api.entrypoints=${TRAEFIK_ENTRYPOINT:-websecure}
      - traefik.http.routers.bl_myapp-api.tls=true
      - traefik.http.routers.bl_myapp-api.tls.certresolver=${TRAEFIK_CERT_RESOLVER:-letsencrypt}
      - traefik.http.services.bl_myapp-api.loadbalancer.server.port=3000
    mem_limit: 512m
    cpus: 0.75

  web:
    image: bl_myapp-app
    build:
      context: ./frontend
      args:
        VITE_API_URL: https://api.${DOMAIN}/api    # baked at build time
    container_name: bl_myapp-app
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    networks:
      - traefik
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik
      - "traefik.http.routers.bl_myapp-web.rule=Host(`${DOMAIN}`)"
      - traefik.http.routers.bl_myapp-web.entrypoints=${TRAEFIK_ENTRYPOINT:-websecure}
      - traefik.http.routers.bl_myapp-web.tls=true
      - traefik.http.routers.bl_myapp-web.tls.certresolver=${TRAEFIK_CERT_RESOLVER:-letsencrypt}
      - traefik.http.services.bl_myapp-web.loadbalancer.server.port=80
    mem_limit: 128m
    cpus: 0.25

  # One-off (profile "tools"): never starts with `up`. Uses the backend's
  # `build` stage, which already has the Prisma CLI + schema + migrations.
  #   docker compose run --rm --build migrate
  migrate:
    image: bl_myapp-migrate
    container_name: bl_myapp-migrate
    build:
      context: ./backend
      target: build
    profiles:
      - tools
    env_file:
      - .env
    networks:
      - mysql_shared
    command: ["npx", "prisma", "migrate", "deploy"]
    mem_limit: 512m
    cpus: 0.5

networks:
  mysql_shared:
    external: true
  traefik:
    external: true
```
Replace `myapp` consistently everywhere (image, container, Traefik
router/service names — all the same string). `Host()` rule: **always a
single domain** by default — never add `|| Host(\`www.${DOMAIN}\`)` unless
the user explicitly asks for it. Single-host alternative: serve both on
`${DOMAIN}` and route `/api` with a Traefik path rule — then no CORS is
needed.

## Root .env / .env.example
Three layers, never mixed: root (Docker infra: `DOMAIN`, `TRAEFIK_*`, DB
credentials, JWT secrets), backend (app runtime: business config, JWT,
throttle, CORS), frontend (build-time: only `VITE_*`, never a secret).

```env
# Public domain (Traefik)
DOMAIN=myapp.seudominio.com.br
TRAEFIK_ENTRYPOINT=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt

# Shared MySQL (container name on mysql_shared — never localhost)
MYSQL_HOST=mysql_shared
MYSQL_PORT=3306
MYSQL_DATABASE=mydb
MYSQL_USER=myapp_user
MYSQL_PASSWORD=troque_esta_senha

# Backend runtime
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://myapp.seudominio.com.br

# JWT (min 32 chars each, distinct secrets)
JWT_ACCESS_SECRET=troque-por-uma-chave-aleatoria-bem-longa-32chars
JWT_REFRESH_SECRET=outra-chave-aleatoria-bem-longa-e-diferente-32
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```
`.env.example` has the same keys with placeholder values and IS committed. Use
consistent variable names across projects (e.g. always `ADMIN_EMAIL`/
`ADMIN_PASSWORD`, never `SEED_ADMIN_*` in one project and `ADMIN_USERNAME` in
another). Document the unit when ambiguous (e.g. `THROTTLE_TTL_MS=60000`, not
`THROTTLE_TTL=60` with no context).

## Deploy checklist
```bash
cp .env.example .env
# Edit .env: DOMAIN, MYSQL_*, JWT_*, CORS_ORIGIN

# 1. Create the MySQL database + user in the shared instance (manually, once)
# 2. Apply pending migrations BEFORE swapping the running app
docker compose run --rm --build migrate

# 3. Build and start api + web with the new code
docker compose up -d --build

# 4. Verify
docker logs bl_myapp-api
curl https://api.${DOMAIN}/api/health   # expect {"status":"ok"}
```
Always assume Traefik, the `mysql_shared` network, and the MySQL container
already exist on the host. The `migrate` service never runs on its own — run
it explicitly on every deploy that may include a new migration; it's a fast
no-op when there's nothing pending, so it's safe to run every time.

## Anti-patterns (do NOT do)
- `docker-compose` (hyphen) instead of `docker compose`.
- `image` and `container_name` not matching, or either one missing/auto-generated.
- `MYSQL_HOST=localhost` inside a container.
- Running `prisma migrate deploy` in the Dockerfile build, `migrate reset` in
  production, or migrating via `docker compose exec` into the live app
  container instead of the dedicated `migrate` service.
- Injecting `VITE_*` at container runtime (they must be build args).
- Committing `.env`; putting secrets in the image or in `VITE_*`.
- A dedicated MySQL container per project without a reason.
- Running the container as root (missing `USER node`).
- No `HEALTHCHECK`, or a `depends_on` without `condition: service_healthy`
  when the upstream service has a healthcheck.
- No `mem_limit`/`cpus` on a shared VPS.
- No log rotation (`logging.driver: json-file` + `max-size`/`max-file`),
  letting logs grow unbounded.
- `Host() || Host(www...)` by default — only add it if explicitly requested.
- Pinning a Node version without checking it's still an LTS in support.

## Definition of Done (checklist before considering it done)
- [ ] `docker compose run --rm --build migrate` applies pending migrations
      before `docker compose up -d --build` brings both containers up.
- [ ] `image` and `container_name` are the same `{prefix}_{project}-{type}` string; `image:` declared with `build:`.
- [ ] API on `mysql_shared` + `traefik`; web on `traefik`; both external.
- [ ] Root `.env` drives Compose + app; `.env` gitignored, `.env.example` tracked.
- [ ] `MYSQL_HOST=mysql_shared`; DB + user created before deploy.
- [ ] Non-root user, `HEALTHCHECK`, `mem_limit`/`cpus`, and log rotation set
      on every long-running service.
- [ ] `web`'s `depends_on: api` uses `condition: service_healthy`.
- [ ] Frontend `VITE_API_URL` passed as a build arg; nginx SPA fallback present.
- [ ] Traefik labels correct (TLS, entrypoint, router/service = container name,
      single `Host()` unless `www` was explicitly requested).
- [ ] `/api/health` returns ok over HTTPS; `docker logs` clean.
