---
name: backend-nestjs-rules
description: >-
  Build or review production NestJS APIs with Prisma 7, MySQL, Zod, secure
  authentication and authorization, Jest/Supertest tests, safe error handling,
  and Swagger. Use for Nest modules, controllers, services, repositories,
  Prisma schemas/migrations, API security, and backend tests. Pair with
  frontend-react-rules and docker-compose-rules when those layers are in scope.
---

# Backend NestJS Rules

Build a typed, secure, tested modular monolith. Prefer simple, explicit code and
real business rules over framework ceremony or speculative architecture.

## Fixed project choices

- TypeScript 7 with `strict: true`; Node.js LTS; NestJS.
- Prisma 7 with `@prisma/adapter-mariadb` and **MySQL in every environment**, including tests. Do not introduce PostgreSQL or SQLite.
- Zod with `nestjs-zod` for every external input: body, params, query, headers when relevant, webhooks, environment variables, and external API/model responses.
- JWT access token with a short TTL plus an **opaque, rotating refresh token** in an `HttpOnly` cookie.
- Argon2id for new password hashes. Support bcrypt only when migrating or verifying legacy hashes.
- RBAC for roles and query-level ownership/tenant scope for each protected resource.
- `@nestjs/throttler`, with stricter limits on authentication and other sensitive endpoints.
- Structured logs with `nestjs-pino`, redaction, correlation IDs, and audit records for critical actions.
- **Jest + Supertest** for unit, integration, e2e, and security tests. Do not add Vitest to the backend.
- ESLint, Prettier, Swagger/OpenAPI, and a CI pipeline that runs lint, typecheck, tests, security tests, and build.

## Read the relevant reference

- For TypeScript configuration, Nest module format, Prisma 7, MySQL, migrations, or aliases, read [TypeScript, Prisma and MySQL](references/backend-nestjs/typescript-prisma-mysql.md).
- For authentication, authorization, SQL injection, validation, cookies, CORS, CSRF, logs, uploads, SSRF, or other security-sensitive work, read [Backend security](references/backend-nestjs/security.md).
- For Jest, Supertest, disposable MySQL databases, CI, or security tests, read [Backend testing](references/backend-nestjs/testing.md).

Do not load unrelated references merely because the skill was selected.

## Architecture

Use this default layout unless the existing project has a clear equivalent:

```text
src/
  bootstrap/configure-app.ts
  config/
  prisma/
  common/
    decorators/
    filters/
    guards/
    interceptors/
    logger/
  modules/<resource>/
    dto/
    <resource>.module.ts
    <resource>.controller.ts
    <resource>.service.ts
    <resource>.repository.ts
    <resource>.spec.ts
  app.module.ts
  main.ts
test/
  setup-e2e.ts
  jest-e2e.config.ts
  security.e2e-spec.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
generated/prisma/
prisma.config.ts
```

Keep the dependency direction explicit:

```text
controller (HTTP) -> service (business rules) -> repository (Prisma)
```

- Controllers translate HTTP and call services; they never access Prisma.
- Services enforce business rules and authorization decisions that are not naturally part of a scoped query.
- Repositories own database access and must accept the authenticated scope needed to constrain each query.
- Do not add a repository abstraction that merely renames every Prisma method without improving security, testability, or domain clarity.

## Implementation workflow

1. Inspect the existing project, versions, conventions, and uncommitted work before changing code.
2. Define the HTTP contract and authorization rule for the operation.
3. Create strict, bounded Zod schemas and explicit response shapes.
4. Implement controller, service, and repository without passing raw request objects or unchecked DTO spreads between layers.
5. Enforce role and resource scope using identity from the validated access token, never from client-supplied `userId`, `tenantId`, `empresaId`, or `role`.
6. Add focused unit tests for domain decisions and Supertest coverage for the real HTTP pipeline.
7. Update OpenAPI and operational documentation when the contract or required environment changes.

## Application wiring

- Put the global prefix, pipes, filters, guards, interceptors, Helmet, CORS, cookie parsing, body limits, correlation ID, and production Swagger policy in `configureApp(app)`.
- Call the same `configureApp(app)` from `main.ts` and the e2e bootstrap. Tests must exercise the production pipeline.
- Validate environment variables at startup and fail closed. Never provide fallback secrets.
- Return a stable error envelope such as `{ error: { code, message, requestId } }`.
- Never return stack traces, Prisma/driver messages, SQL, table names, column names, secrets, hashes, or internal paths to clients.
- Use explicit public selects/mappers for users and other sensitive entities. Adding a database column must not automatically expose it in an API response.
- Bound pagination and every collection/string input. Oversized JSON and uploads must fail with `413`, not exhaust memory.

## TypeScript and imports

- Use `module: "nodenext"` and `moduleResolution: "nodenext"` as this project's Node configuration.
- Do not use `baseUrl` or `ignoreDeprecations`. Prefer relative imports.
- `nodenext` is a project choice, not the only Node mode supported by TypeScript.
- An injected Nest class is a runtime value: import it normally, never with `import type`. This rule is independent of `verbatimModuleSyntax`.
- Keep module format consistent across Nest, generated Prisma Client, Jest, and production output.

## Database and migrations

- Use MySQL only. A local or e2e database is a dedicated MySQL schema/container, never SQLite.
- Keep all runtime database access in repositories and use Prisma's typed query API by default.
- Never use `$queryRawUnsafe` or `$executeRawUnsafe`. Dynamic fields, sorting, filters, and projections come from server-owned allow-lists.
- Change schema through `schema.prisma` and versioned migrations. Never use `migrate reset` or `migrate dev` against production.
- Do not apply migrations to a real environment without the user's authorization. Generating/reviewing migration files does not authorize deployment.
- Do not enable value-bearing query logs in production.

## Authentication and authorization invariants

- Access token: signed JWT, 5-15 minute TTL, validated algorithm, issuer, audience, type, expiry, and subject.
- Refresh token: 32+ random bytes, opaque rather than JWT, stored only as a SHA-256 digest (or keyed HMAC digest when a separate pepper is intentionally configured), rotated transactionally, and revoked by family on reuse.
- An opaque refresh token has no `JWT_REFRESH_SECRET`. Use `JWT_ACCESS_SECRET`; add a separately named `REFRESH_TOKEN_PEPPER` only if using HMAC.
- Refresh cookies are `HttpOnly`; `Secure` is mandatory in production; `SameSite`, domain, and path must match the deployment. Clearing the cookie repeats the same attributes.
- RBAC answers whether a role may perform an action. Ownership/tenant scoping answers whether this caller may act on this row. Enforce both.
- Return `404` for a protected resource the caller is not allowed to know exists. Use `403` when the resource is visible but the action is forbidden.

## Baseline security

- Treat every value outside the trust boundary as untrusted.
- Use strict schemas, explicit DTO-to-Prisma mapping, allow-listed query structure, exact CORS origins, Helmet, rate limits, safe cookies, CSRF protection for cookie-authenticated state changes, and centralized error handling.
- Protect login against both IP spraying and per-account brute force without permanent lockouts that enable denial of service.
- Never log request bodies, authorization/cookie headers, passwords, hashes, tokens, secrets, or unbounded external payloads.
- Validate webhook signatures over the raw body before parsing business data.
- Outbound requests and uploads require explicit allow-lists, size/time limits, safe filenames, and SSRF/path-traversal defenses.
- Swagger/debug endpoints must be disabled or protected in production.

## Testing requirements

- Use Jest as the backend runner. Nest is runner-agnostic, but its official scaffolding and testing examples use Jest and Supertest.
- Prefer `ts-jest` for the default reliable Nest setup. Use `@swc/jest` only with decorator metadata and module format configured and verified.
- Unit-test services, guards, and domain functions by mocking boundaries rather than Nest itself when the framework is not under test.
- E2E tests use the real global pipeline and a disposable MySQL test database guarded against accidental production access.
- Every protected resource needs horizontal and vertical authorization tests. The mandatory security suite also covers token rotation/reuse, mass assignment, injection payloads, error hygiene, CORS, rate limits, and secret-field leakage.
- A skipped security test fails CI.

## Definition of done

- [ ] TypeScript strict; lint and typecheck pass; no unjustified `any`, `baseUrl`, or `ignoreDeprecations`.
- [ ] MySQL/Prisma 7 configuration, generated client, migrations, and module format are consistent.
- [ ] Every external input is strictly validated and bounded; DTOs are mapped explicitly.
- [ ] Controller/service/repository boundaries are clear; controllers do not use Prisma.
- [ ] Access JWT, opaque rotating refresh tokens, logout/revocation, RBAC, and resource scoping work as documented.
- [ ] SQL injection, IDOR, mass assignment, brute force, CSRF, CORS, error, logging, upload, and outbound-request controls relevant to the feature are present.
- [ ] Jest unit tests, Supertest e2e tests, and the security suite pass against a protected disposable MySQL database.
- [ ] Swagger, README/environment documentation, health checks, Docker build, and CI reflect the delivered system.
