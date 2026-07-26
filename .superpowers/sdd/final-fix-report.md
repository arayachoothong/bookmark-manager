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
