# Multi-stage Docker + GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship root multi-stage `Dockerfile.api` / `Dockerfile.web`, a Compose stack (`postgres` + `migrate` + `api` + `web`), and a GitHub Actions workflow that builds the stack and runs API e2e + HTTP smoke.

**Architecture:** Build both images from the monorepo root with pnpm workspaces. API image has `build`, `migrate`, and `runtime` targets; migrate is a one-shot Compose service (`prisma migrate deploy`) that must exit 0 before API starts. Web bakes `VITE_*` at image build time and serves via `nginx:alpine` with SPA `try_files`. CI Job A runs lint + unit/Vitest on the runner; Job B runs full `docker compose build/up`, wait loops (no `/health`), API Jest e2e against composed Postgres, and HTTP checks. Playwright Auth0 smoke stays out of CI.

**Tech Stack:** Docker multi-stage, Compose v2, `node:22-alpine`, `nginx:alpine`, `postgres:16-alpine`, pnpm 9.15.0, NestJS, Prisma, Vite, GitHub Actions.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-docker-compose-ci-design.md`
- Images: exactly two Dockerfiles at **repo root** — `Dockerfile.api` + `Dockerfile.web`; build context = monorepo root
- Web runtime: `nginx:alpine` + SPA `try_files` via `docker/nginx.conf`
- Migrations: separate Compose `migrate` one-shot (`prisma migrate deploy`); API depends on migrate **completed successfully**
- Seed: **opt-in only** — never run seed on every `compose up`
- Health: **no** new `/health` route — wait via Postgres healthcheck, migrate exit 0, `GET /me` → **401**, `GET /` → **200**
- Browser `VITE_API_BASE_URL` for local Compose/CI: `http://localhost:4000` (not `http://api:4000`)
- CI: `.github/workflows/ci.yml` — Job A lint+unit/Vitest; Job B full compose build/up + API e2e + HTTP smoke
- Playwright Auth0 smoke: **out of CI**
- Secrets: never bake private credentials into images; `.dockerignore` excludes `.env` files
- YAGNI / TDD / frequent commits; keep `pnpm db:up` usable for local Nest/Vite (postgres-only)

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `.dockerignore` | **Create** — keep build context small; exclude secrets, `node_modules`, build artifacts |
| `docker/nginx.conf` | **Create** — SPA fallback for React Router |
| `Dockerfile.api` | **Create** — stages `base` → `build` → `migrate` + `runtime` |
| `Dockerfile.web` | **Create** — Vite build with `ARG`/`ENV` `VITE_*` → nginx runtime |
| `docker-compose.yml` | **Modify** — add `migrate`, `api`, `web`; keep existing postgres |
| `scripts/wait-for-stack.sh` | **Create** — poll migrate exit + `/me` 401 + `/` 200 |
| `.github/workflows/ci.yml` | **Create** — Job A + Job B |
| `package.json` | **Modify** — `db:up` = postgres only; add `stack:up` / `stack:down` |
| `README.md` | **Modify** — Compose stack + CI + Vite build-arg footguns |

---

### Task 1: `.dockerignore` + nginx SPA config

**Files:**
- Create: `.dockerignore`
- Create: `docker/nginx.conf`

**Interfaces:**
- Consumes: none
- Produces: nginx `server` listening on port 80 with `try_files $uri /index.html`; dockerignore patterns later tasks rely on

- [ ] **Step 1: Create `.dockerignore`**

```dockerignore
.git
.github
.cursor
.worktrees
transcripts
**/node_modules
**/dist
**/coverage
**/test-results
**/playwright-report
**/.env
**/.env.*
!**/.env.example
apps/web/e2e/.env
*.md
!README.md
docs
CLAUDE.md
```

- [ ] **Step 2: Create `docker/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Sanity-check files exist**

Run:

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
test -f .dockerignore && test -f docker/nginx.conf && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add .dockerignore docker/nginx.conf
git commit -m "$(cat <<'EOF'
chore: add dockerignore and nginx SPA config

EOF
)"
```

---

### Task 2: `Dockerfile.api` (build, migrate, runtime)

**Files:**
- Create: `Dockerfile.api`

**Interfaces:**
- Consumes: monorepo `apps/api` sources + Prisma schema/migrations; pnpm `@bookmark-manager/api`
- Produces:
  - Image targets: `build`, `migrate`, `runtime` (default final stage = `runtime`)
  - `migrate` CMD: `pnpm exec prisma migrate deploy` with cwd `apps/api`
  - `runtime` CMD: `node dist/main` (Nest `start:prod`) listening on `PORT` default `4000`
  - Runtime requires env: `DATABASE_URL`, `AUTH0_ISSUER`, `AUTH0_AUDIENCE` (optional `CORS_ORIGIN`, `AUTH0_DOMAIN`, `PORT`)

- [ ] **Step 1: Create `Dockerfile.api`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client/package.json ./packages/api-client/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @bookmark-manager/api exec prisma generate
RUN pnpm --filter @bookmark-manager/api build

# One-shot migrate image (includes Prisma CLI from workspace install)
FROM build AS migrate
WORKDIR /app/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
WORKDIR /app/apps/api
RUN chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

If Nest emits `dist/main` without `.js` extension in `package.json` scripts only, confirm after first build: `docker run --rm --entrypoint ls <image> dist` and keep `node dist/main.js` if that file exists (Nest normally emits `.js`).

- [ ] **Step 2: Build runtime image (expect success)**

Run:

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
docker build -f Dockerfile.api --target runtime -t bookmark-manager-api:local .
```

Expected: build completes; no missing lockfile / workspace package errors.

- [ ] **Step 3: Confirm migrate target builds and prisma is present**

Run:

```bash
docker build -f Dockerfile.api --target migrate -t bookmark-manager-migrate:local .
docker run --rm --entrypoint sh bookmark-manager-migrate:local -c 'pnpm exec prisma -v'
```

Expected: Prisma version printed (CLI available).

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.api
git commit -m "$(cat <<'EOF'
feat: add multi-stage Dockerfile.api with migrate target

EOF
)"
```

---

### Task 3: `Dockerfile.web` (Vite → nginx)

**Files:**
- Create: `Dockerfile.web`

**Interfaces:**
- Consumes: `docker/nginx.conf`; packages `@bookmark-manager/web`, `@bookmark-manager/ui`, `@bookmark-manager/api-client`
- Produces: nginx image on port 80; build-args `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL` (default `http://localhost:4000`)

- [ ] **Step 1: Create `Dockerfile.web`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client/package.json ./packages/api-client/
RUN pnpm install --frozen-lockfile
COPY packages/ui ./packages/ui
COPY packages/api-client ./packages/api-client
COPY apps/web ./apps/web

ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @bookmark-manager/web build

FROM nginx:alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 2: Build web image with public SPA build-args**

Run (values match committed `.env.example` public SPA config — not secrets):

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
docker build -f Dockerfile.web \
  --build-arg VITE_AUTH0_DOMAIN=dev-yg.us.auth0.com \
  --build-arg VITE_AUTH0_CLIENT_ID=H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA \
  --build-arg VITE_AUTH0_AUDIENCE=https://bbl-candidate-test-api \
  --build-arg VITE_API_BASE_URL=http://localhost:4000 \
  -t bookmark-manager-web:local .
```

Expected: Vite build succeeds; image tagged.

- [ ] **Step 3: Smoke nginx serves index**

Run:

```bash
docker run -d --name bm-web-smoke -p 3080:80 bookmark-manager-web:local
curl -s -o /dev/null -w "%{http_code}" http://localhost:3080/
docker rm -f bm-web-smoke
```

Expected: HTTP status `200`.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.web
git commit -m "$(cat <<'EOF'
feat: add multi-stage Dockerfile.web with nginx SPA runtime

EOF
)"
```

---

### Task 4: Compose stack + root scripts

**Files:**
- Modify: `docker-compose.yml`
- Modify: `package.json` (scripts `db:up`, `db:down`, add `stack:up`, `stack:down`)

**Interfaces:**
- Consumes: `Dockerfile.api` targets `migrate` + `runtime`; `Dockerfile.web`; existing postgres service
- Produces:
  - Services: `postgres`, `migrate`, `api`, `web`
  - Host ports: `5432`, `4000`, `3000` (web maps `3000:80`)
  - In-compose API `DATABASE_URL=postgresql://bookmark:bookmark@postgres:5432/bookmark?schema=public`
  - Scripts: `pnpm db:up` → postgres only; `pnpm stack:up` → full stack build+up; `pnpm stack:down` → `down -v`

- [ ] **Step 1: Replace `docker-compose.yml` with full stack**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: bookmark
      POSTGRES_PASSWORD: bookmark
      POSTGRES_DB: bookmark
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookmark -d bookmark"]
      interval: 5s
      timeout: 5s
      retries: 5

  migrate:
    build:
      context: .
      dockerfile: Dockerfile.api
      target: migrate
    environment:
      DATABASE_URL: postgresql://bookmark:bookmark@postgres:5432/bookmark?schema=public
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
      target: runtime
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: postgresql://bookmark:bookmark@postgres:5432/bookmark?schema=public
      AUTH0_ISSUER: ${AUTH0_ISSUER}
      AUTH0_AUDIENCE: ${AUTH0_AUDIENCE}
      AUTH0_DOMAIN: ${AUTH0_DOMAIN:-}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      PORT: "4000"
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
      args:
        VITE_AUTH0_DOMAIN: ${VITE_AUTH0_DOMAIN}
        VITE_AUTH0_CLIENT_ID: ${VITE_AUTH0_CLIENT_ID}
        VITE_AUTH0_AUDIENCE: ${VITE_AUTH0_AUDIENCE}
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:4000}
    ports: ["3000:80"]
    depends_on:
      - api

volumes:
  pgdata:
```

- [ ] **Step 2: Update root `package.json` scripts**

Change scripts to:

```json
"db:up": "docker compose up -d postgres",
"db:down": "docker compose down",
"stack:up": "docker compose up --build -d",
"stack:down": "docker compose down -v"
```

Keep all other scripts unchanged.

- [ ] **Step 3: Bring postgres-only via `db:up` (regression)**

Run:

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
pnpm db:down || true
pnpm db:up
docker compose ps
```

Expected: only `postgres` running (and healthy).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml package.json
git commit -m "$(cat <<'EOF'
feat: extend compose with migrate, api, and web services

EOF
)"
```

---

### Task 5: Wait script + local full-stack verification

**Files:**
- Create: `scripts/wait-for-stack.sh`

**Interfaces:**
- Consumes: Compose project with services `migrate`, `api`, `web`
- Produces: exit 0 when migrate succeeded and HTTP probes pass; exit non-zero on timeout
- Env overrides: `COMPOSE_FILE` (default compose), `API_URL` (default `http://localhost:4000/me`), `WEB_URL` (default `http://localhost:3000/`), `TIMEOUT_SECONDS` (default `120`)

- [ ] **Step 1: Create `scripts/wait-for-stack.sh`**

```bash
#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:4000/me}"
WEB_URL="${WEB_URL:-http://localhost:3000/}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-120}"
COMPOSE="docker compose"

deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

echo "Waiting for migrate to complete successfully..."
while true; do
  status="$($COMPOSE ps -a --format '{{.Service}} {{.Status}}' | awk '$1=="migrate" {print substr($0, index($0,$2))}')"
  case "$status" in
    *Exited\ \(0\)*|*exited\ \(0\)*)
      echo "migrate: $status"
      break
      ;;
    *Exited*|*exited*)
      echo "migrate failed: $status" >&2
      $COMPOSE logs migrate >&2 || true
      exit 1
      ;;
  esac
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for migrate" >&2
    $COMPOSE logs migrate >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Waiting for API $API_URL → 401..."
while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$API_URL" || true)"
  if [ "$code" = "401" ]; then
    echo "API ready (HTTP $code)"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for API (last HTTP $code)" >&2
    $COMPOSE logs api >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Waiting for web $WEB_URL → 200..."
while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$WEB_URL" || true)"
  if [ "$code" = "200" ]; then
    echo "Web ready (HTTP $code)"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "Timed out waiting for web (last HTTP $code)" >&2
    $COMPOSE logs web >&2 || true
    exit 1
  fi
  sleep 2
done

echo "Stack is ready."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/wait-for-stack.sh
```

- [ ] **Step 3: Start full stack with env from `.env.example` values**

Create a temporary env file for Compose variable substitution (do not commit):

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
pnpm stack:down || true
set -a
# shellcheck disable=SC1091
. ./.env.example
set +a
pnpm stack:up
./scripts/wait-for-stack.sh
```

Expected: script prints `Stack is ready.`; `curl` checks already embedded.

- [ ] **Step 4: Confirm seed was not auto-run**

Run:

```bash
docker compose exec -T postgres psql -U bookmark -d bookmark -c "SELECT count(*) FROM \"User\";"
```

Expected: `0` (or empty demo data) unless you previously seeded this volume. If count > 0 from an old volume, run `pnpm stack:down` (removes volume) and repeat Step 3 once — after a clean volume, count must be `0` without an explicit seed.

- [ ] **Step 5: Commit**

```bash
git add scripts/wait-for-stack.sh
git commit -m "$(cat <<'EOF'
feat: add compose stack wait script for api and web readiness

EOF
)"
```

---

### Task 6: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `scripts/wait-for-stack.sh`, Compose stack, existing Jest e2e (in-process Nest + `DATABASE_URL` to host `localhost:5432`)
- Produces: workflow on `push` + `pull_request` with jobs `unit` and `stack`
- Job `unit`: `pnpm lint`, `pnpm --filter @bookmark-manager/api test`, `pnpm --filter @bookmark-manager/web test`
- Job `stack`: `docker compose build` + `up -d`, wait script, then API e2e on runner against composed Postgres; on failure dump logs; always `docker compose down -v`
- Does **not** run Playwright

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  AUTH0_ISSUER: https://dev-yg.us.auth0.com/
  AUTH0_AUDIENCE: https://bbl-candidate-test-api
  AUTH0_DOMAIN: dev-yg.us.auth0.com
  CORS_ORIGIN: http://localhost:3000
  VITE_AUTH0_DOMAIN: dev-yg.us.auth0.com
  VITE_AUTH0_CLIENT_ID: H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA
  VITE_AUTH0_AUDIENCE: https://bbl-candidate-test-api
  VITE_API_BASE_URL: http://localhost:4000
  DATABASE_URL: postgresql://bookmark:bookmark@localhost:5432/bookmark?schema=public

jobs:
  unit:
    name: Lint + unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm --filter @bookmark-manager/api test
      - run: pnpm --filter @bookmark-manager/web test

  stack:
    name: Compose build + e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build compose images
        run: docker compose build

      - name: Start stack
        run: docker compose up -d

      - name: Wait for stack
        run: chmod +x scripts/wait-for-stack.sh && ./scripts/wait-for-stack.sh

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @bookmark-manager/api exec prisma generate

      - name: API e2e against composed Postgres
        run: pnpm --filter @bookmark-manager/api test:e2e

      - name: Dump compose logs on failure
        if: failure()
        run: docker compose logs

      - name: Tear down stack
        if: always()
        run: docker compose down -v
```

Notes for implementers:
- Workflow `env` supplies Compose `${VAR}` substitution for `api`/`web` build-args and API runtime Auth0 vars (public SPA + known tenant issuer/audience from `.env.example`).
- API Jest e2e boots Nest **in-process** on the runner and talks to Postgres on `localhost:5432` (published by compose). It does **not** HTTP-call the `api` container; the container is validated by the wait script’s `GET /me` → 401.
- E2e specs set `AUTH0_ISSUER` / `AUTH0_AUDIENCE` to test issuer values in `beforeAll` — that overrides process env after the job starts; ensure `DATABASE_URL` remains the composed Postgres URL.

- [ ] **Step 2: Validate workflow YAML locally (syntax)**

Run:

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
python3 - <<'PY'
import yaml
yaml.safe_load(open(".github/workflows/ci.yml"))
print("ci.yml OK")
PY
```

Expected: `ci.yml OK`. If PyYAML is missing, install with `pip3 install pyyaml` or use `actionlint` if available; do not skip parse check.

- [ ] **Step 3: Local dry-run of Job B sequence (optional but preferred before push)**

With Docker available:

```bash
set -a; . ./.env.example; set +a
export DATABASE_URL=postgresql://bookmark:bookmark@localhost:5432/bookmark?schema=public
pnpm stack:down || true
docker compose build
docker compose up -d
./scripts/wait-for-stack.sh
pnpm --filter @bookmark-manager/api exec prisma generate
pnpm --filter @bookmark-manager/api test:e2e
pnpm stack:down
```

Expected: wait script OK; e2e suite green.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: add GitHub Actions lint/unit and compose stack jobs

EOF
)"
```

---

### Task 7: README — Compose stack, CI, Vite footguns

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: scripts `db:up`, `stack:up`, `stack:down`, `scripts/wait-for-stack.sh`
- Produces: documented local full-stack path + CI overview + explicit Vite build-arg / localhost API notes

- [ ] **Step 1: Update Prerequisites**

Change Docker line to:

```markdown
- Docker + Docker Compose (Postgres, optional full API/web stack)
```

- [ ] **Step 2: Add “Docker Compose stack” section after Setup and run**

Insert:

```markdown
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

For local Nest + Vite development, keep using **Postgres only**:

```bash
pnpm db:up          # postgres on :5432
pnpm --filter @bookmark-manager/api prisma:migrate
pnpm --filter @bookmark-manager/api prisma:seed   # opt-in
pnpm dev:api
pnpm dev:web
```

**Footguns:**
- `VITE_*` values are baked at **web image build** time. Changing Auth0/API URL requires `docker compose build web` (or `pnpm stack:up`).
- The browser must call `http://localhost:4000`, not the Docker DNS name `http://api:4000`.
- Seed is never run by Compose; use `prisma:seed` when you want demo rows.
```

- [ ] **Step 3: Add CI blurb under Verification**

Append:

```markdown
**CI (GitHub Actions):** Job A runs `pnpm lint` + API unit + web Vitest. Job B builds/starts the Compose stack, waits for `GET /me` → 401 and `GET /` → 200, then runs API Jest e2e against composed Postgres. Playwright Auth0 smoke is not part of CI.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: document compose stack, wait script, and CI

EOF
)"
```

---

## Self-review (author checklist)

**Spec coverage**
- Two root Dockerfiles → Tasks 2–3
- nginx SPA + `docker/nginx.conf` → Tasks 1 + 3
- Compose postgres + migrate + api + web → Task 4
- `.dockerignore` → Task 1
- Seed opt-in only → Task 5 Step 4 + Task 7
- No `/health`; wait via migrate + `/me` 401 + `/` 200 → Task 5 + Task 6
- CI Job A / Job B + Playwright out → Task 6
- Vite localhost build-arg footgun → Tasks 3–4 + 7
- Migrate image has Prisma CLI + migrations → Task 2 migrate target

**Placeholder scan:** no TBD/TODO; commands and file contents are concrete.

**Type/name consistency:** service names `postgres`/`migrate`/`api`/`web`; scripts `stack:up`/`stack:down`/`db:up`; wait script path `scripts/wait-for-stack.sh`; filter `@bookmark-manager/api` / `@bookmark-manager/web`.
