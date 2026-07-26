# Final critical-fix pass (whole-branch review)

**Branch:** `feat/bookmark-manager-app`  
**Date:** 2026-07-26

## Fixes

| # | Area | Change |
|---|------|--------|
| 1 | CORS | `apps/api/src/main.ts` — `enableCors` for `http://localhost:3000`, `credentials: true`; optional `CORS_ORIGIN` |
| 2 | Seed ↔ Auth0 | `UsersService.findOrCreateFromClaims` — after miss on `auth0Sub`, match by email and update `auth0Sub` (seed link) |
| 3 | Email without Action | `Auth0UserinfoClient` — first-create path calls `{AUTH0_ISSUER}/userinfo` when access token lacks `email` |

## Verification

- `pnpm test`: 9 unit + **24** e2e (3 new `/me` cases)
- Web build not required (API-only)

## E2E added

- Seeded fake sub + email → login with real sub, same email → 200, `auth0Sub` updated
- First login without email claim → userinfo mock supplies email
- First login without email and empty userinfo → 401

---

# Final review fixes (`pnpm dev`)

**Branch:** `feat/pnpm-dev`
**Date:** 2026-07-26

## Fixes

- Added `prisma generate` before `prisma migrate deploy` in `dev:prep`.
- Updated the README prerequisite from Node 20+ to Node 22+.
- Documented Prisma client generation in the local development flow.

## Verification

### `node -e "console.log(require('./package.json').scripts['dev:prep'])"`

```text
pnpm db:up && ./scripts/wait-for-postgres.sh && pnpm --filter @bookmark-manager/api exec prisma generate && pnpm --filter @bookmark-manager/api exec prisma migrate deploy
```

Exit code: 0

### `rg -n 'Node ' README.md`

```text
16:- Node 22+
```

Exit code: 0

### `pnpm --filter @bookmark-manager/api exec prisma generate`

```text
warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7.
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
✔ Generated Prisma Client (v6.19.3)
```

Exit code: 0

### IDE diagnostics

No linter errors in `package.json` or `README.md`.
