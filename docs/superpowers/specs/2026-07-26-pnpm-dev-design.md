# `pnpm dev` unified local development

**Date:** 2026-07-26  
**Scope:** Root scripts so one command brings up Postgres, applies migrations, and runs Nest API + Vite web together. Optional seeded path via a separate script.  
**Builds on:** Existing `dev:api` / `dev:web`, `db:up`, Prisma migrate/seed, Docker Compose postgres service.  
**Approach:** Sequential prep (`db:up` → wait healthy → `migrate deploy`) then `concurrently` for API + web. Seed stays opt-in via `pnpm dev:seed`.

## 1. Goal

Replace the two-terminal local flow (`pnpm dev:api` + `pnpm dev:web`) with:

- `pnpm dev` — Postgres + migrate + API + web  
- `pnpm dev:seed` — same as `dev`, plus Prisma seed after migrate  

Keep `dev:api` and `dev:web` for running a single process.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| What `pnpm dev` starts | Postgres (Compose) + migrate + Nest API + Vite web |
| Seed | Not on every `dev`; separate `pnpm dev:seed` seeds then starts apps |
| App orchestration | `concurrently` (root `devDependency`) with `[api]` / `[web]` prefixes |
| Migrate command | `prisma migrate deploy` (non-interactive) |
| Env files | Manual (`cp` from examples); `dev` does not create `.env` |
| Postgres after Ctrl+C | Stays up; tear down via existing `pnpm db:down` |
| Out of scope | Auto-copy `.env`, full Docker API/web stack (`stack:up`), codegen, Playwright |

## 3. Scripts

### 3.1 Root `package.json`

| Script | Responsibility |
| --- | --- |
| `dev:prep` | `pnpm db:up` → wait until Postgres accepts connections → `pnpm --filter @bookmark-manager/api exec prisma migrate deploy` |
| `dev:apps` | `concurrently -n api,web -c blue,green --kill-others-on-fail "pnpm dev:api" "pnpm dev:web"` |
| `dev` | `pnpm dev:prep && pnpm dev:apps` |
| `dev:seed` | `pnpm dev:prep && pnpm --filter @bookmark-manager/api prisma:seed && pnpm dev:apps` |
| `dev:api` / `dev:web` | Unchanged |

Exact `concurrently` flags may use the package’s documented equivalents as long as: named prefixes, colored output, and killing the sibling process when one fails.

### 3.2 Postgres wait

Add a small root script (e.g. `scripts/wait-for-postgres.sh`) that polls until Postgres is ready (Compose health / `pg_isready` against the `postgres` service), with a finite timeout and non-zero exit on failure. `dev:prep` invokes this after `db:up` and before migrate.

Reuse patterns from `scripts/wait-for-stack.sh` where helpful, but keep this script focused on Postgres only (Nest/Vite are not in Docker for this flow).

### 3.3 Dependencies

- Add `concurrently` as a **root** `devDependency` (version pinned via normal pnpm install / lockfile update).
- No new scripts inside `apps/api` or `apps/web` required beyond existing `start:dev` / `dev`.

## 4. Failure and lifecycle

1. Docker unavailable / Compose cannot start postgres → `dev:prep` fails; apps do not start.  
2. Wait timeout → fail before migrate.  
3. Migrate or seed fails → fail before `dev:apps`.  
4. Either API or web exits with error → concurrently stops the other.  
5. Ctrl+C → both app processes stop; Postgres container remains running.  

## 5. Documentation

Update README **Setup and run** (and the Postgres-only path under Docker Compose stack) so the primary local path is:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev          # or: pnpm dev:seed
```

Document that `dev:api` / `dev:web` remain for single-process work, and that `db:down` still stops Postgres.

## 6. Success criteria

- `pnpm dev` starts Postgres (if needed), applies migrations, serves API on `:4000` and web on `:3000` with labeled concurrent logs.  
- `pnpm dev:seed` additionally runs seed once before apps.  
- Prep failures never leave orphan concurrent app processes from that invocation.  
- README documents the new default flow.  

## 7. Testing / verification

Manual (sufficient for script-only change):

1. With Docker available and env files present: run `pnpm dev`, confirm API and web respond; Ctrl+C stops apps; `docker compose ps` still shows postgres.  
2. Run `pnpm dev:seed` on a clean or existing DB and confirm seed completes then apps start.  
3. Stop Docker / block Postgres and confirm `pnpm dev` exits during prep with a clear failure.  
