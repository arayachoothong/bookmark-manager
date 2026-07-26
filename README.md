# Bookmark Manager

Private read-later bookmark manager (take-home). Monorepo with NestJS API, React SPA, shared UI, and Orval-generated API client.

## Repo layout (grader names)

| Path | Role |
|------|------|
| `apps/api` | **Backend** — NestJS, Prisma, Postgres, Auth0 JWT guard |
| `apps/web` | **Frontend** — React, Vite, MUI + Tailwind, Auth0 PKCE |
| `packages/api-client` | OpenAPI → Orval → axios + React Query hooks |
| `packages/ui` | Shared presentational components |

## Prerequisites

- Node 20+
- [pnpm](https://pnpm.io/) 9+
- Docker (Postgres)

## Environment

Copy app env templates (API and web are enough for local dev; root `.env.example` is optional convenience):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/api/.env` includes Postgres (**5433** on the host — see `docker-compose.yml`), Auth0 JWT verification (`AUTH0_ISSUER`, `AUTH0_AUDIENCE`), optional `AUTH0_DOMAIN`, and `CORS_ORIGIN=http://localhost:3000`. `pnpm dev:api` loads `apps/api/.env` via Nest `--env-file`.

Web Auth0 PKCE variables are in `apps/web/.env.example`. Do not commit real secrets.

## Setup and run

```bash
pnpm install
pnpm db:up
pnpm --filter @bookmark-manager/api prisma:migrate
pnpm --filter @bookmark-manager/api prisma:seed
pnpm dev:api    # http://localhost:4000 — Swagger at /api in dev
pnpm dev:web    # http://localhost:3000
```

The API enables CORS for `http://localhost:3000` (override with `CORS_ORIGIN`) so the Vite SPA can call the API with credentials during local dev.

Regenerate the typed client after API contract changes:

```bash
pnpm codegen:api
```

## Auth token

API Bearer credential: Auth0 **access token** bound to audience `https://bbl-candidate-test-api`. ID tokens are not accepted — they authenticate the SPA user to Auth0, not the caller to this API. See [DECISIONS.md](./DECISIONS.md).

**First login / user provisioning:** Prefer an `email` custom claim on the access token (Auth0 Action on login). If the claim is missing on a brand-new user, the API falls back to Auth0 `/userinfo` with the same Bearer token (`AUTH0_ISSUER` domain). Returning users are matched by `sub` only. Seeded demo users (fake `auth0Sub` in `prisma/seed`) are linked to the real Auth0 `sub` on first login when the email matches.

## Verification

```bash
pnpm test   # API unit + privacy e2e (requires Postgres up)
pnpm lint
```

## Scope: completed vs skipped

**Completed:** Postgres + Prisma, RS256 access-token verification, `/me`, collections/bookmarks CRUD with privacy rules, collection filter and nested bookmarks, email-based read-only shares (unknown email → 404), collection delete nulls `collectionId`, Swagger + offline OpenAPI export + Orval client, web scaffold (Auth0 PKCE, React Query, Router on port 3000), collections and bookmarks UI wired to generated hooks.

**Deferred:** Auth0 interactive UI smoke (manual login in browser not automated in CI). **Bonuses** (import, tags, full-text search, etc.) explicitly skipped.

**Tests:** Privacy-focused API e2e suites are green when `pnpm db:up` is running.

## Living docs

- [API_DESIGN.md](./API_DESIGN.md) — HTTP contract and privacy notes  
- [DECISIONS.md](./DECISIONS.md) — ADRs  
- [AI_WORKFLOW.md](./AI_WORKFLOW.md) — how this was built with agents  
- [transcripts/](./transcripts/) — reconstructed session logs (messy corrections kept; secrets redacted)
