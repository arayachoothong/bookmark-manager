# Multi-stage Docker + GitHub Actions CI

**Date:** 2026-07-26  
**Scope:** `bookmark-manager` monorepo — `Dockerfile.api`, `Dockerfile.web`, Compose stack (`postgres` + `migrate` + `api` + `web`), `.dockerignore`, GitHub Actions CI (build + test).  
**Builds on:** Existing Postgres Compose service, Nest API, Vite SPA, Prisma migrations, API Jest e2e (mocked JWT).  
**Approach:** Two multi-stage images at repo root; separate one-shot migrate service; CI Job A = lint + unit/Vitest, Job B = full `docker compose build/up` then API e2e + HTTP smoke. No new `/health` route; Playwright Auth0 smoke stays out of CI.

## 1. Goal

Ship a reproducible local/demo stack (API + nginx SPA + Postgres + migrate) and a CI pipeline that builds those images and proves the stack starts and the existing API e2e suite passes against it.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Project | `bookmark-manager` (not patient-intake) |
| Images | Two: `Dockerfile.api` + `Dockerfile.web` |
| Web runtime | `nginx:alpine` + SPA `try_files` |
| Migrations | Separate Compose `migrate` one-shot (`prisma migrate deploy`); API depends on migrate completed |
| Layout | Dockerfiles at **repo root**; build context = monorepo root |
| Seed | Opt-in only (not on every `compose up`) |
| Health endpoint | **None** — wait on Postgres healthcheck, migrate exit 0, `GET /me` → 401, `GET /` → 200 |
| CI | GitHub Actions `.github/workflows/ci.yml` |
| CI stack | Full `docker compose build` + `up` (not Actions postgres-service-only) |
| CI Auth0 UI | Out of scope (Playwright smoke remains opt-in local) |
| Out of scope | All-in-one Nest static hosting; TLS/Caddy; baking private secrets into images |

## 3. Docker architecture

### 3.1 Files

| Path | Responsibility |
| --- | --- |
| `Dockerfile.api` | Multi-stage Nest API image |
| `Dockerfile.web` | Multi-stage Vite build → nginx |
| `docker/nginx.conf` | SPA fallback for React Router |
| `docker-compose.yml` | `postgres` + `migrate` + `api` + `web` |
| `.dockerignore` | Exclude secrets, `node_modules`, `dist`, `.git`, transcripts, e2e `.env` |
| README | Build/run Compose + note Vite build-args |

### 3.2 `Dockerfile.api` stages

1. **base** — `node:22-alpine` + pnpm (corepack)  
2. **deps** — copy workspace manifests; install deps for api + workspace packages  
3. **build** — copy sources; `prisma generate`; `pnpm --filter @bookmark-manager/api build`  
4. **runtime** — production node image with `dist`, Prisma schema + migrations, prod deps; non-root user; `CMD` runs Nest (`node` on api `dist/main`, exact path confirmed at implement time)

Migrate job uses the same API image (or build stage that includes Prisma CLI) with override command `prisma migrate deploy`.

### 3.3 `Dockerfile.web` stages

1. **deps** — install for web + `@bookmark-manager/ui` + `@bookmark-manager/api-client`  
2. **build** — `ARG`/`ENV` bake `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL`  
3. **runtime** — `nginx:alpine`; copy `apps/web/dist` → `/usr/share/nginx/html`; copy `docker/nginx.conf`

**Browser vs Docker DNS:** `VITE_API_BASE_URL` for local Compose/CI must be `http://localhost:4000` (host-published API), **not** `http://api:4000`.

### 3.4 Compose topology

- **postgres** — existing image/ports/healthcheck (`5432`)  
- **migrate** — depends on postgres healthy; `prisma migrate deploy`; restart `no`  
- **api** — depends on migrate completed; env `DATABASE_URL`, Auth0 JWT verify vars, `CORS_ORIGIN`; publish `4000:4000`  
- **web** — build-args for Vite; publish `3000:80`

## 4. Env and secrets

- Compose / CI inject runtime API secrets via env file or workflow `env` (never commit real `.env`).  
- Web public Auth0 client id / domain / audience are build-args (already public SPA config pattern).  
- Rebuild web image when Vite vars change (Vite inlines at build time).  
- `.dockerignore` must exclude `.env`, `apps/*/.env`, `apps/web/e2e/.env`.

## 5. CI (GitHub Actions)

**Triggers:** `push`, `pull_request`.

### Job A — lint + unit

1. Checkout, setup Node + pnpm, `pnpm install --frozen-lockfile`  
2. `pnpm lint`  
3. `pnpm --filter @bookmark-manager/api test`  
4. `pnpm --filter @bookmark-manager/web test`  

### Job B — compose build + stack verification

1. `docker compose build` (api, web, migrate using api image) with documented `VITE_*` build-args  
2. `docker compose up -d`  
3. Wait loops (no fixed `sleep`-only): migrate exit 0; poll `GET http://localhost:4000/me` until **401**; poll `GET http://localhost:3000/` until **200**  
4. Run API e2e against composed Postgres/API (same Jest e2e suite; `DATABASE_URL` / API base URL pointed at the stack; JWT mock unchanged)  
5. On failure: `docker compose logs`; always `docker compose down -v`  

Playwright Auth0 smoke is **not** part of CI.

## 6. Success criteria

- `docker compose up` locally brings migrate → api → web with working Auth0 SPA against real tenant (manual).  
- CI Job A green without Docker.  
- CI Job B builds both images, starts stack, API e2e green, HTTP checks pass.  
- No private credentials in images or committed env files.  
- No new `/health` endpoint.

## 7. Documented footguns

- Vite env is build-time; Compose runtime env does not rewrite the SPA bundle.  
- Browser must call `localhost:4000`, not Docker service DNS.  
- Migrate container must include Prisma CLI + migration files, not only Nest `dist`.
