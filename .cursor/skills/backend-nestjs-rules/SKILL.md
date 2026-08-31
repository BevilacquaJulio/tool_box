---
name: backend-nestjs-rules
description: >-
  Agent rules for building a professional, production-ready backend API with
  NestJS + Prisma 7 + MySQL + Zod. Use when creating, editing, or reviewing any
  backend code: NestJS modules, controllers/services/repositories, Prisma
  schema and migrations, JWT auth with RBAC, validation, error handling, tests,
  and Swagger docs. Pairs with the frontend-react-rules and docker-compose-rules
  skills.
---

# Agent Rules — Backend (NestJS)

> Rules file for an AI agent (Claude Code / Cursor). Follow these guidelines when
> creating, editing, or reviewing any backend code in this project. They define
> the standard of a **professional, tested, production-ready** Node system — not
> a tutorial CRUD. For deployment (Docker, Traefik, MySQL network) follow the
> **docker-compose-rules** skill. For the UI follow **frontend-react-rules**.

## Objective
Build a robust, typed, tested, deployable **backend API**. Prioritize clarity,
security, and maintainability. Depth of delivery matters more than feature count.

## Mandatory stack (do not invent alternatives without justifying)
- **Language:** TypeScript (`strict` on). Never plain JavaScript.
- **Runtime:** Node.js LTS.
- **Framework:** **NestJS** (this project wants the enterprise/modular
  architecture — do not fall back to bare Express).
- **ORM:** **Prisma 7** with the **`@prisma/adapter-mariadb`** driver adapter
  (required in Prisma 7).
- **Database:** **MySQL** (shared instance in production — see
  docker-compose-rules). SQLite allowed only for early local prototyping.
- **Validation:** **Zod** on every external input (body, params, query), wired
  through **`nestjs-zod`** (`createZodDto` + a global `ZodValidationPipe`).
- **Auth:** JWT (**access + refresh** token, distinct secrets) + password hash
  with `bcryptjs`. **RBAC** via Nest **guards** when there are roles.
- **Config:** `@nestjs/config` + `dotenv`. Secrets only via environment
  variables — never in code.
- **Logs:** `pino` (via `nestjs-pino`), structured. Never `console.log` in
  production code.
- **Tests:** Vitest + Supertest.
- **Lint/format:** ESLint + Prettier.
- **API docs:** Swagger/OpenAPI (`@nestjs/swagger`) at `/api/docs`.

## Folder structure (always follow)
```
src/
  config/
    env.validation.ts       # Zod schema for process.env (validate at boot)
    database-url.ts         # build encoded mysql:// URL from MYSQL_* vars
  prisma/
    prisma.module.ts        # @Global module
    prisma.service.ts       # PrismaClient + mariadb adapter + lifecycle
    prisma.check.ts         # standalone connection self-test
  modules/
    <resource>/
      <resource>.module.ts
      <resource>.controller.ts   # HTTP only
      <resource>.service.ts      # business logic
      <resource>.repository.ts   # DB access (Prisma) — keep queries here
      dto/                       # Zod schemas via createZodDto
      <resource>.spec.ts         # tests
  common/
    filters/                # AllExceptionsFilter (uniform error envelope)
    guards/                 # JwtAuthGuard, RolesGuard
    decorators/             # @CurrentUser, @Roles
    dto/pagination.dto.ts   # ?page & ?limit convention
  main.ts                   # bootstrap: helmet, CORS, prefix 'api', Swagger, listen 0.0.0.0
  app.module.ts             # ConfigModule + PrismaModule + APP_PIPE ZodValidationPipe + feature modules
prisma/
  schema.prisma             # datasource has NO url (it lives in prisma.config.ts)
  migrations/
  seed.ts
generated/prisma/           # generated client (gitignored, built in CI/Docker)
prisma.config.ts
```

## Code rules
- **ALWAYS** separate layers: `controller` (HTTP) → `service` (business logic) →
  `repository` (Prisma). Controllers never touch Prisma directly.
- **ALWAYS** validate input with Zod (`createZodDto`) before any logic. Reject
  with 400/422 and a clear message. The `ZodValidationPipe` is registered
  globally via `APP_PIPE`.
- **ALWAYS** type everything. `any` is forbidden — use `unknown` + narrowing.
- **ALWAYS** handle errors through a **central exception filter** and return a
  consistent shape: `{ error: { code, message } }` with the correct HTTP status.
- **ALWAYS** use correct status codes (200/201/204/400/401/403/404/409/422/500).
- **ALWAYS** paginate and filter list endpoints (`?page`, `?limit`); return
  `{ data, total, page, limit }`.
- **ALWAYS** select explicit fields in Prisma queries that return users — never
  return `passwordHash`.
- **NEVER** put a secret, token, or password in code or the repository.
- **NEVER** trust client input. Validate and sanitize.
- **NEVER** leave an `async` path without error handling. Use `async/await`, not
  chained `.then`.

## Critical Prisma 7 + MySQL rules (do this or it fails at startup)
- **Driver adapter is mandatory.** `new PrismaClient()` with no adapter throws in
  Prisma 7. Use `@prisma/adapter-mariadb` (`PrismaMariaDb`) in `PrismaService`.
- **Generator is `prisma-client` with an `output` path** (not
  `prisma-client-js`). Import `PrismaClient` from the generated folder
  (`generated/prisma/client`), never from `@prisma/client`. Run `prisma generate`
  in the build.
- **`prisma.config.ts` holds the datasource URL** — remove `url = env(...)` from
  the `datasource` block in `schema.prisma`.
- **URL-encode the password** in the connection URL (`encodeURIComponent` on user
  and password) so `@ # : / ? & =` don't corrupt it. Append `?charset=utf8mb4`.
- **Let Prisma own the schema.** Normal flow: edit `schema.prisma`, then run a
  migration — **Prisma generates the SQL for you**, you do not hand-write it. The
  agent edits `schema.prisma` and generates the migration files; **the user runs
  `prisma migrate deploy`** to apply them, so the agent never connects to the
  database itself (this satisfies the "agent never runs SQL on my DB" rule
  without you pasting SQL by hand). **Never** run `migrate dev`/`migrate reset` in
  production (data loss).
- **Only drop to raw SQL for what Prisma can't express** (triggers, views,
  complex indexes, data backfills): `prisma migrate dev --create-only` creates an
  empty migration — write the SQL into its `migration.sql`. This is an escape
  hatch, not the default.
- **Runtime never touches the schema** — launching the app only opens
  connections and runs queries, so a manual DB change is never reverted on boot.
  Avoid ad-hoc edits made directly in phpMyAdmin/DBeaver *outside* Prisma: they
  don't break startup, but they cause *drift* from the migration history. Since
  Prisma manages the schema, make schema changes through Prisma and drift never
  happens.

## Security (mandatory)
- `helmet` (security headers), `@nestjs/config`-driven **CORS locked to
  `CORS_ORIGIN`**, `@nestjs/throttler` rate limiting.
- Passwords always hashed (`bcryptjs`, cost ≥ 10), never plain text.
- JWT: short-lived access token + refresh token; rotate and allow revocation of
  refresh tokens (store a hash per user).
- Authorization (RBAC) checked in a **guard**, not in the controller.
- Never expose stack traces or internal details in error responses.

## Tests (not optional)
- Every `service` has a **unit** test (mock the repository/Prisma).
- Every endpoint has an **integration** test (Supertest) covering happy path +
  errors (400/401/404).
- Mock only at the boundaries (DB, network, I/O). Use a disposable test database,
  never the shared production one.
- Tests must pass in CI before any merge.

## Quality & DevOps
- `GET /api/health` (liveness); optional readiness that runs `SELECT 1` via
  `PrismaService`.
- Validate `process.env` at boot with Zod — fail fast on a missing/invalid var.
- Migrations versioned with Prisma Migrate (never alter the DB by hand outside a
  migration).
- README with: what it is, stack, how to run, architecture decisions, and a
  simple diagram.

## AI feature (differentiator — when applicable)
- If integrating an LLM, use **structured output** and **validate the response
  with Zod** before using it.
- Treat timeout, cost, and failure of the AI API like any external integration.
- Never send sensitive user data to the model without need.

## Anti-patterns (do NOT do)
- Microservices, Kubernetes, or hexagonal architecture in a simple project. A
  well-organized modular monolith first.
- Shallow CRUD with no business rules, no tests, no deploy.
- Committed secrets, localhost-only projects, scattered `any`, forgotten debug
  `console.log`.
- Controllers querying Prisma directly; business logic in controllers.
- Over-engineering in general. Simple and well-made > complex and fragile.

## Definition of Done (checklist before considering it done)
- [ ] TypeScript strict, zero `any`, lint passing.
- [ ] Input validated with Zod on every route (global ZodValidationPipe).
- [ ] Layers separated (controller/service/repository); no Prisma in controllers.
- [ ] Auth + RBAC working (if applicable); refresh-token rotation.
- [ ] Unit + integration tests passing.
- [ ] Central exception filter + consistent error shape.
- [ ] Security: helmet, CORS locked, rate-limit, hashed passwords.
- [ ] Prisma 7 wired correctly: mariadb adapter, generated client, prisma.config.ts, encoded URL.
- [ ] Migrations versioned; `migrate deploy` used in prod (never reset).
- [ ] Docker builds and runs the project (see docker-compose-rules); CI green.
- [ ] README with decisions + deploy with a live URL.
```
