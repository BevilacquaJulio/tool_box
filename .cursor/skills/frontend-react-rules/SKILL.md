---
name: frontend-react-rules
description: >-
  Agent rules for building a modern, typed, professional React frontend with
  Vite + TypeScript + Tailwind + TanStack Query + React Router + React Hook Form
  + Zod, consuming a NestJS API. Use when creating, editing, or reviewing any
  frontend code: components, feature folders, API client, data hooks, forms,
  routing, and tests. Pairs with backend-nestjs-rules and docker-compose-rules.
---

# Agent Rules — Frontend (React)

> Rules file for an AI agent (Claude Code / Cursor). Follow these guidelines when
> creating, editing, or reviewing any frontend code in this project. They define
> the standard of a **modern, typed, professional** React app — not a tutorial
> app. It consumes the NestJS API (see **backend-nestjs-rules**); for deployment
> follow **docker-compose-rules**.

## Objective
Build a fast, typed, maintainable **React** interface that consumes the backend
API. Always handle the three data states: **loading, error, and empty**. Clarity
and user experience above cleverness.

## Mandatory stack (do not invent alternatives without justifying)
- **Language:** TypeScript (`strict`). Never plain JavaScript.
- **Build/dev:** Vite.
- **UI:** React (functional components + hooks; no class components).
- **Server state:** TanStack Query (React Query) — for everything from the API.
- **Global UI state:** Context API or Zustand (only when needed; avoid
  unnecessary global state).
- **Routing:** React Router.
- **Forms:** React Hook Form + Zod validation (`@hookform/resolvers`). Reuse the
  backend's Zod schemas where possible so client and server validate identically.
- **Styling:** Tailwind CSS (v4 via `@tailwindcss/vite`).
- **HTTP:** one central client (axios) in `lib/api.ts`, `baseURL` from
  `import.meta.env.VITE_API_URL`. Never scattered loose `fetch`.
- **Tests:** Vitest + React Testing Library.
- **Lint/format:** ESLint + Prettier.

## Folder structure (always follow)
```
src/
  app/            # route setup, providers (QueryClient, Router)
  features/
    <resource>/
      components/
      hooks/          # useXxxQuery, useXxxMutation (React Query)
      <resource>.api.ts    # API calls for this resource
      <resource>.types.ts  # types (ideally inferred from shared Zod schemas)
  components/     # reusable UI components (Button, Input...)
  hooks/          # generic hooks
  lib/            # api client, helpers
  main.tsx
```

## Code rules
- **ALWAYS** small, single-responsibility functional components. If it passes
  ~150 lines, break it up.
- **ALWAYS** type props with `type`/`interface`. `any` is forbidden.
- **ALWAYS** use React Query for server data — never `useEffect` + manual `fetch`
  to load data.
- **ALWAYS** handle states: `isLoading`, `isError`, and empty list. Never render
  assuming the data already arrived.
- **ALWAYS** validate forms with Zod (via React Hook Form).
- **ALWAYS** use semantic HTML (`button`, `label`, `nav`, `main`) and a `label`
  tied to each input (accessibility). **No emojis in the UI** — use inline SVG
  icons with `aria-hidden="true"` (or `aria-label` when the icon is the only
  content).
- **NEVER** put business logic inside a component — extract to a hook or function.
- **NEVER** do deep prop drilling — use Context/Query.
- **NEVER** manipulate the DOM directly (`document.querySelector`); let React
  control it.
- **NEVER** put a secret or API key in the frontend. Only public vars via
  `import.meta.env.VITE_*` (they are baked in at build time — never a secret).
- List `key`s always a stable id, never the index.

## Data & API
- Every call goes through the central client (`lib/api.ts`) with `baseURL` from
  env. Attach the JWT access token in an interceptor; keep tokens out of
  `localStorage` for high-value tokens (prefer memory / httpOnly cookie).
- One hook per operation: `useUsersQuery`, `useCreateUserMutation`, etc.
- Surface API errors to the user (toast/message), never silently. The backend
  returns `{ error: { code, message } }` — render `message`.
- Invalidate/refetch queries after mutations (React Query).

## Quality & performance
- Lazy load routes (`React.lazy` + `Suspense`).
- `useMemo`/`useCallback` **only** for a real performance problem — not by
  default.
- Loading with skeleton/spinner; feedback on every action (disable the button
  while submitting).
- Responsive layout (mobile-first with Tailwind).

## Tests
- Test behavior from the user's point of view (React Testing Library): render,
  interact, assert what appears.
- Cover at least: the main component, one form flow, and one error state.
- Don't test implementation detail (internal state names).

## Git
- Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Small, descriptive commits.

## Anti-patterns (do NOT do)
- A giant component that does everything. Break it into smaller ones.
- `useEffect` to fetch data when React Query exists.
- `any`, deep prop drilling, global state without need.
- Ignoring loading/error/empty (the #1 cause of an app that "breaks" in the demo).
- Heavy Redux in a simple project — start with Query + Context.

## Definition of Done (checklist before considering it done)
- [ ] TypeScript strict, zero `any`, lint passing.
- [ ] Server data via React Query, with loading/error/empty handled.
- [ ] Forms validated with Zod + React Hook Form.
- [ ] Small components, typed props, no business logic inside them.
- [ ] Semantic HTML and labels (basic accessibility); no emojis in the UI.
- [ ] Central API client, no secret in the frontend.
- [ ] Main tests passing (component, form, error).
- [ ] Responsive (mobile + desktop).
- [ ] Routes lazy-loaded; visual feedback on every action.
- [ ] README with how to run + required environment variables.
```
