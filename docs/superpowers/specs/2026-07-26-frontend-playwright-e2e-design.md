# Frontend Playwright E2E — Auth0 Smoke

**Date:** 2026-07-26  
**Scope:** `apps/web` Playwright smoke against real Auth0 Universal Login + running API/Postgres.  
**Builds on:** Existing SPA (`RequireAuth` → Auth0 PKCE), Create menu flows, API privacy e2e (unchanged).  
**Approach:** Playwright in `apps/web` with a shared Auth0 login helper; thin smoke only (login → create collection → create bookmark → logout). Credentials in gitignored `e2e/.env`.

## 1. Goal

Add an opt-in browser e2e that exercises the real Auth0 redirect/login path and a minimal authenticated CRUD smoke through the product UI, without expanding into a full UI regression suite.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Auth strategy | Full Auth0 Universal Login in the browser (not mocked Auth0, not ROPG token inject) |
| Credentials | Gitignored `apps/web/e2e/.env` with `E2E_AUTH0_USERNAME` / `E2E_AUTH0_PASSWORD`; commit `.env.example` only |
| Suite scope | Thin smoke: login → `/collections` → create collection → create bookmark → logout |
| Tooling | Playwright (`@playwright/test`) under `apps/web` |
| Servers | API + Postgres already running; Playwright `webServer` starts Vite only |
| Default `pnpm test` | Unchanged for CI without secrets; add opt-in `test:e2e` on web |
| Out of scope | Search, share, 403/404 pages, starting Nest from Playwright, mocking Auth0, ROPG |

## 3. Architecture

### 3.1 Layout

| Path | Responsibility |
| --- | --- |
| `apps/web/playwright.config.ts` | `baseURL` (default `http://localhost:3000`), timeouts generous for Auth0, `webServer` → Vite |
| `apps/web/e2e/smoke.spec.ts` | Single smoke scenario |
| `apps/web/e2e/helpers/auth.helper.ts` | Navigate to protected route, complete Universal Login, wait for app shell |
| `apps/web/e2e/.env.example` | Empty credential keys + comments |
| `apps/web/e2e/.env` | Local secrets (gitignored explicitly; `apps/*/.env` does not cover nested `e2e/.env`) |
| README | Prerequisites and run command |

### 3.2 Auth helper

1. `page.goto("/collections")` (triggers `RequireAuth` → `loginWithRedirect`).  
2. On Auth0 hosted login, fill email/password (support common Classic / New Universal Login selectors where practical).  
3. Wait until app chrome is visible (e.g. Collections heading and/or Create menu).  
4. If `E2E_AUTH0_USERNAME` / `E2E_AUTH0_PASSWORD` are missing, fail fast with a clear error before navigating.

### 3.3 Smoke flow

1. Login via helper.  
2. Assert URL is `/collections` (or navigates there after callback).  
3. Create collection via Create menu → unique name `E2E Collection ${Date.now()}`.  
4. Create bookmark via Create menu → unique title + valid URL; confirm it appears (list or success path).  
5. Logout via existing shell Logout control.

Prefer role/label/text selectors aligned with current UI copy; avoid brittle CSS chains.

## 4. Runtime and docs

**Local run:**

1. `pnpm db:up` + migrate/seed as needed  
2. `pnpm dev:api`  
3. Copy `apps/web/e2e/.env.example` → `.env` and set credentials for an Auth0 user that can hit this API (ideally email matching seed candidate if demo data is desired)  
4. `pnpm --filter @bookmark-manager/web test:e2e`

**Data:** Unique names per run so smoke does not depend on wiping seed data.

**Risks:** Auth0 UI churn breaks the helper (single fix point). Missing secrets or API down cause clear failures. Not included in default root `pnpm test` so graders without Auth0 secrets stay green.

## 5. Success criteria

- Playwright smoke can log in through real Auth0, create a collection and a bookmark in the UI, then logout.  
- No credentials committed; `.env.example` + README document setup.  
- API unit/e2e and web Vitest remain the default automated suite; web e2e is opt-in.
