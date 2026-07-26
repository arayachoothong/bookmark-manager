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

Copy root and app env templates:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Postgres runs on host port **5433** (see `docker-compose.yml`):

```env
DATABASE_URL=postgresql://bookmark:bookmark@localhost:5433/bookmark?schema=public
```

Auth0 (candidate test tenant) variables are in `.env.example` / `apps/web/.env.example`. Do not commit real secrets.

## Setup and run

```bash
pnpm install
pnpm db:up
pnpm --filter @bookmark-manager/api prisma:migrate
pnpm --filter @bookmark-manager/api prisma:seed
pnpm dev:api    # http://localhost:4000 — Swagger at /api in dev
pnpm dev:web    # http://localhost:3000
```

Regenerate the typed client after API contract changes:

```bash
pnpm codegen:api
```

## Auth token

API Bearer credential: Auth0 **access token** bound to audience `https://bbl-candidate-test-api`. ID tokens are not accepted — they authenticate the SPA user to Auth0, not the caller to this API. See [DECISIONS.md](./DECISIONS.md).

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
- [transcripts/](./transcripts/) — session notes (secrets redacted)
