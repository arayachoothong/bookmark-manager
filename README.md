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
- Docker + Docker Compose (Postgres, optional full API/web stack)

## Environment

Copy app env templates (API and web are enough for local dev; root `.env.example` is optional convenience):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/api/.env` includes Postgres (**5432** on the host — see `docker-compose.yml`), Auth0 JWT verification (`AUTH0_ISSUER`, `AUTH0_AUDIENCE`), optional `AUTH0_DOMAIN`, and `CORS_ORIGIN=http://localhost:3000`. `pnpm dev:api` loads `apps/api/.env` via Nest `--env-file`.

Web Auth0 PKCE variables are in `apps/web/.env.example`. Do not commit real secrets.

## Setup and run

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev          # Postgres + migrate + API (:4000) + web (:3000)
# or: pnpm dev:seed   # same as dev, plus prisma seed before apps
```

`pnpm dev` starts Docker Postgres if needed, waits until it accepts connections, runs `prisma migrate deploy`, then runs Nest and Vite together (logs prefixed `api` / `web`). Ctrl+C stops the apps; Postgres stays up — use `pnpm db:down` to stop it.

For a single process only:

```bash
pnpm dev:api    # http://localhost:4000 — Swagger at /api in dev
pnpm dev:web    # http://localhost:3000
```

Demo data: `pnpm dev:seed` (or `pnpm --filter @bookmark-manager/api prisma:seed`) creates **3 collections** and **10 bookmarks** owned by `candidate@test.com` (plus Alice’s private collection for share demos). On first Auth0 login, if your token email matches `candidate@test.com`, the API links that user and the demo rows appear. To use your own Auth0 email, change the candidate email in `apps/api/prisma/seed.ts` before seeding.

The API enables CORS for `http://localhost:3000` (override with `CORS_ORIGIN`) so the Vite SPA can call the API with credentials during local dev.

Regenerate the typed client after API contract changes:

```bash
pnpm codegen:api
```

## Docker Compose stack

Full demo stack (migrate → API → nginx SPA):

```bash
# Load public Compose/build vars (or export the same keys yourself)
set -a; source .env.example; set +a
pnpm stack:up
./scripts/wait-for-stack.sh
# API http://localhost:4000  |  Web http://localhost:3000
```

Tear down (removes the Postgres volume):

```bash
pnpm stack:down
```

For local Nest + Vite development (Postgres only, not the full Docker API/web images):

```bash
pnpm dev          # or: pnpm dev:seed
# single process: pnpm dev:api / pnpm dev:web
# stop Postgres: pnpm db:down
```

**Footguns:**
- `VITE_*` values are baked at **web image build** time. Changing Auth0/API URL requires `docker compose build web` (or `pnpm stack:up`).
- The browser must call `http://localhost:4000`, not the Docker DNS name `http://api:4000`.
- Seed is never run by Compose; use `prisma:seed` when you want demo rows.

## Auth token

**Choice:** API Bearer credential = Auth0 **access token** for audience `https://bbl-candidate-test-api`.  
**Rationale:** Access tokens are audience-bound to this API; ID tokens are authentication receipts for the SPA client and are the wrong credential for authorization. Details and trade-offs: [DECISIONS.md](./DECISIONS.md).

**SPA flow:** Authorization Code + **PKCE (S256)** via `@auth0/auth0-react` — no implicit flow (`response_type=token`).

**Tenant verification (not assumed):** Before locking the design we fetched:

- Discovery: `https://dev-yg.us.auth0.com/.well-known/openid-configuration`
- JWKS: `https://dev-yg.us.auth0.com/.well-known/jwks.json`

Observed: `code_challenge_methods_supported` includes **S256**; JWKS keys are **RS256**; discovery still lists **implicit** and ID-token algs including **HS256** — so we use Auth Code + PKCE, validate access tokens with a **RS256-only** allowlist, and never accept ID tokens as Bearer.

**First login / user provisioning:** Prefer an `email` custom claim on the access token (Auth0 Action on login). If the claim is missing on a brand-new user, the API falls back to Auth0 `/userinfo` with the same Bearer token (`AUTH0_ISSUER` domain). Returning users are matched by `sub` only. Seeded demo users (fake `auth0Sub` in `prisma/seed`) are linked to the real Auth0 `sub` on first login when the email matches.

## Verification

```bash
pnpm test   # API unit + privacy e2e (requires Postgres up)
pnpm lint
```

**Web Playwright (opt-in):** requires API + Postgres up, Auth0 SPA env in `apps/web/.env`, and credentials in `apps/web/e2e/.env` (see `apps/web/e2e/.env.example`). Then:

```bash
pnpm --filter @bookmark-manager/web test:e2e
```

Not part of default `pnpm test` (needs real Auth0 user secrets).

**CI (GitHub Actions):** Job A runs `pnpm lint` + API unit + web Vitest. Job B builds/starts the Compose stack, waits for `GET /me` → 401 and `GET /` → 200, then runs API Jest e2e against composed Postgres. Playwright Auth0 smoke is not part of CI.

## Scope: completed vs skipped

**Completed:** Postgres + Prisma, RS256 access-token verification, `/me`, collections/bookmarks CRUD with privacy rules, collection filter and nested bookmarks, email-based read-only shares (unknown email → 404), collection delete nulls `collectionId`, Swagger + offline OpenAPI export + Orval client, web scaffold (Auth0 PKCE, React Query, Router on port 3000), collections and bookmarks UI wired to generated hooks.

**Deferred:** Auth0 interactive UI smoke is available as opt-in Playwright (`apps/web/e2e`); not in default `pnpm test` or CI without secrets. **Bonuses** (import, tags, full-text search, etc.) explicitly skipped.

**Tests:** Privacy-focused API e2e suites are green when `pnpm db:up` is running.

## Living docs

- [API_DESIGN.md](./API_DESIGN.md) — HTTP contract and privacy notes  
- [DECISIONS.md](./DECISIONS.md) — ADRs  
- [AI_WORKFLOW.md](./AI_WORKFLOW.md) — how this was built with agents  
- [transcripts/](./transcripts/) — curated session indexes + Cursor UI chat exports in `transcripts/exports/` (secrets redacted; see `transcripts/README.md`)
