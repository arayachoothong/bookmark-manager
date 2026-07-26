# Frontend Playwright Auth0 Smoke E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Playwright smoke in `apps/web` that logs in through real Auth0 Universal Login, creates a collection and a bookmark in the UI, then logs out.

**Architecture:** Playwright lives under `apps/web`. A shared `loginAsE2eUser(page)` fills Auth0 hosted login using gitignored `e2e/.env` credentials. Playwright `webServer` starts Vite only; Nest API + Postgres must already be running. Default root `pnpm test` stays free of Auth0 secrets.

**Tech Stack:** `@playwright/test`, Vite SPA (`apps/web`), Auth0 Universal Login (PKCE via existing `@auth0/auth0-react`), Nest API on `:4000`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-frontend-playwright-e2e-design.md`
- Auth: full Auth0 Universal Login in the browser — not mocked Auth0, not ROPG token inject
- Credentials: `apps/web/e2e/.env` with `E2E_AUTH0_USERNAME` / `E2E_AUTH0_PASSWORD` (gitignored); commit `e2e/.env.example` only
- Suite: thin smoke only — login → `/collections` → create collection → create bookmark → logout
- Servers: API + Postgres already up; Playwright starts Vite only
- Opt-in: `pnpm --filter @bookmark-manager/web test:e2e` — do **not** add web e2e to default root `pnpm test`
- UI copy to target (current app): brand “Bookmark Manager”, nav “Collections” / “Bookmarks”, menu “Create” → “New collection” / “New bookmark”, collection submit “Create collection”, bookmark submit “Create bookmark”, header “Log out”, list header “Collections”
- Unique names per run: `E2E Collection ${Date.now()}`, `E2E Bookmark ${Date.now()}`
- YAGNI: no search/share/403/404 coverage in this plan
- TDD: write smoke/helper pieces so missing credentials fail clearly before navigation; run smoke after scaffold and watch Auth0/login failures until helper is complete

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/web/playwright.config.ts` | **Create** — baseURL, timeouts, `webServer` → Vite, load `e2e/.env` |
| `apps/web/e2e/smoke.spec.ts` | **Create** — single smoke scenario |
| `apps/web/e2e/helpers/credentials.helper.ts` | **Create** — fail-fast read of username/password |
| `apps/web/e2e/helpers/auth.helper.ts` | **Create** — Universal Login fill + wait for app shell |
| `apps/web/e2e/.env.example` | **Create** — empty credential keys |
| `.gitignore` | Add `apps/web/e2e/.env` |
| `apps/web/package.json` | Add `@playwright/test`, scripts `test:e2e` / `test:e2e:ui` |
| `README.md` | Short note: prerequisites + how to run web e2e |

---

### Task 1: Playwright scaffold, env example, gitignore, scripts

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/.env.example`
- Modify: `.gitignore`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: runnable `pnpm --filter @bookmark-manager/web test:e2e` entrypoint (will fail until specs exist); env key names `E2E_AUTH0_USERNAME`, `E2E_AUTH0_PASSWORD`

- [ ] **Step 1: Add Playwright dependency**

```bash
cd /Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app
pnpm --filter @bookmark-manager/web add -D @playwright/test dotenv
pnpm --filter @bookmark-manager/web exec playwright install chromium
```

Expected: packages added; Chromium installed for local runs.

- [ ] **Step 2: Extend `.gitignore`**

Append:

```gitignore
apps/web/e2e/.env
```

(Keep existing `apps/*/.env`; nested `e2e/.env` needs the explicit line.)

- [ ] **Step 3: Create `apps/web/e2e/.env.example`**

```bash
# Copy to apps/web/e2e/.env (gitignored) and fill in.
# Prefer an Auth0 user whose email matches seed candidate@test.com if you want demo rows.
E2E_AUTH0_USERNAME=
E2E_AUTH0_PASSWORD=
```

- [ ] **Step 4: Create `apps/web/playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(rootDir, "e2e", ".env") });

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --port 3000 --strictPort",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Add scripts to `apps/web/package.json`**

Keep existing `"test": "vitest run"`. Add:

```json
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
```

Do **not** change root `package.json` `test` script to include Playwright.

- [ ] **Step 6: Sanity — config loads**

```bash
pnpm --filter @bookmark-manager/web exec playwright test --list
```

Expected: exits non-zero or lists 0 tests until Task 3 adds a spec — either is fine if config parses without syntax errors. If it errors on “no tests found”, that is OK for this task.

- [ ] **Step 7: Commit**

```bash
git add .gitignore apps/web/package.json apps/web/playwright.config.ts apps/web/e2e/.env.example pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(web): scaffold Playwright for Auth0 smoke e2e

EOF
)"
```

Do not stage `apps/web/e2e/.env` if created locally. Do not stage unrelated dirty files (`.env.example` at root, `docker-compose.yml`, etc.).

---

### Task 2: Credentials + Auth0 login helpers

**Files:**
- Create: `apps/web/e2e/helpers/credentials.helper.ts`
- Create: `apps/web/e2e/helpers/auth.helper.ts`

**Interfaces:**
- Produces:
  - `requireE2eCredentials(): { username: string; password: string }` — throws if either env var missing/blank
  - `loginAsE2eUser(page: Page): Promise<void>` — goto `/collections`, complete Auth0 form, wait for app shell (“Create” button and “Collections” heading)

- [ ] **Step 1: Write credentials helper (fail-fast)**

```typescript
// apps/web/e2e/helpers/credentials.helper.ts

export function requireE2eCredentials(): {
  username: string;
  password: string;
} {
  const username = process.env.E2E_AUTH0_USERNAME?.trim() ?? "";
  const password = process.env.E2E_AUTH0_PASSWORD?.trim() ?? "";
  if (!username || !password) {
    throw new Error(
      "Missing E2E_AUTH0_USERNAME / E2E_AUTH0_PASSWORD. Copy apps/web/e2e/.env.example to apps/web/e2e/.env and fill credentials.",
    );
  }
  return { username, password };
}
```

- [ ] **Step 2: Quick node check that missing env throws**

```bash
cd apps/web && node --input-type=module -e "
import { requireE2eCredentials } from './e2e/helpers/credentials.helper.ts';
delete process.env.E2E_AUTH0_USERNAME;
delete process.env.E2E_AUTH0_PASSWORD;
try { requireE2eCredentials(); process.exit(1); }
catch (e) { console.log(String(e.message)); process.exit(0); }
"
```

If plain node cannot import `.ts`, instead add a one-liner vitest next to it **only if needed** — preferred path: run via Playwright in Task 3 which imports the helper. Alternative verify:

```bash
pnpm --filter @bookmark-manager/web exec tsx -e "
import { requireE2eCredentials } from './e2e/helpers/credentials.helper.ts';
process.env.E2E_AUTH0_USERNAME='';
process.env.E2E_AUTH0_PASSWORD='';
try { requireE2eCredentials(); console.error('expected throw'); process.exit(1); }
catch (e) { console.log('ok', (e as Error).message.includes('Missing')); }
"
```

Install `tsx` only if neither approach works; prefer using the smoke run in Task 3 as the RED proof for missing credentials.

- [ ] **Step 3: Write Auth0 login helper**

```typescript
// apps/web/e2e/helpers/auth.helper.ts
import type { Page } from "@playwright/test";

import { requireE2eCredentials } from "./credentials.helper";

export async function loginAsE2eUser(page: Page): Promise<void> {
  const { username, password } = requireE2eCredentials();

  await page.goto("/collections");

  // Auth0 Universal Login (Classic / New): wait for identifier field
  const userField = page
    .locator(
      'input#username, input[name="username"], input[name="email"], input#email',
    )
    .first();
  await userField.waitFor({ state: "visible", timeout: 60_000 });
  await userField.fill(username);

  const passwordField = page
    .locator('input#password, input[name="password"], input[type="password"]')
    .first();

  // Some tenants use identifier-first: submit email, then password on next screen
  if (!(await passwordField.isVisible().catch(() => false))) {
    await page
      .locator('button[type="submit"], button[name="action"]')
      .first()
      .click();
    await passwordField.waitFor({ state: "visible", timeout: 30_000 });
  }

  await passwordField.fill(password);
  await page
    .locator('button[type="submit"], button[name="action"]')
    .first()
    .click();

  // Back in SPA app shell
  await page.getByRole("button", { name: "Create" }).waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await page.getByRole("heading", { name: "Collections" }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/helpers/credentials.helper.ts apps/web/e2e/helpers/auth.helper.ts
git commit -m "$(cat <<'EOF'
feat(web): add Playwright Auth0 login helpers

EOF
)"
```

---

### Task 3: Smoke spec (login → create collection → create bookmark → logout)

**Files:**
- Create: `apps/web/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `loginAsE2eUser(page)` from Task 2
- Produces: one Playwright test covering the locked smoke path

- [ ] **Step 1: Write the smoke test (will fail without credentials / API / helper wiring)**

```typescript
// apps/web/e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

import { loginAsE2eUser } from "./helpers/auth.helper";

test.describe.configure({ mode: "serial" });

test("Auth0 login, create collection and bookmark, then log out", async ({
  page,
}) => {
  const stamp = Date.now();
  const collectionName = `E2E Collection ${stamp}`;
  const bookmarkTitle = `E2E Bookmark ${stamp}`;
  const bookmarkUrl = `https://example.com/e2e-${stamp}`;

  await loginAsE2eUser(page);
  await expect(page).toHaveURL(/\/collections\/?$/);

  // Create collection
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("menuitem", { name: "New collection" }).click();
  await expect(page).toHaveURL(/\/collections\/new/);
  await page.getByLabel("Name").fill(collectionName);
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page).toHaveURL(/\/collections\/[^/]+$/);
  await expect(page.getByLabel("Name")).toHaveValue(collectionName);

  // Create bookmark (unassigned → lands on /bookmarks)
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("menuitem", { name: "New bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/new/);
  await page.getByLabel("Title").fill(bookmarkTitle);
  await page.getByLabel("URL").fill(bookmarkUrl);
  await page.getByRole("button", { name: "Create bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/?$/);
  await expect(page.getByText(bookmarkTitle)).toBeVisible();

  // Log out
  await page.getByRole("button", { name: "Log out" }).click();
  // After Auth0 logout returnTo origin — guest home redirects toward collections then Auth0 again, or landing
  await expect(page.getByRole("button", { name: "Create" })).toHaveCount(0, {
    timeout: 60_000,
  });
});
```

Note: “Log out” is a native `<button>` in `App.tsx`. If MUI TextField labels are not exposed as accessible names, switch to `page.getByRole("textbox", { name: "Name" })` / `"Title"` / `"URL"` — match whatever Playwright Inspector shows after a failed run.

- [ ] **Step 2: RED — run without credentials (expect clear failure)**

Ensure `apps/web/e2e/.env` is absent or empty. With API optionally down:

```bash
pnpm --filter @bookmark-manager/web test:e2e
```

Expected: FAIL with message containing `Missing E2E_AUTH0_USERNAME` (or Playwright timeout only if credentials somehow present — then unset them).

- [ ] **Step 3: GREEN — run with real credentials + API**

Prerequisites (human / local):

1. `pnpm db:up` + migrate/seed as needed  
2. `pnpm dev:api` listening on `:4000`  
3. `cp apps/web/e2e/.env.example apps/web/e2e/.env` and fill real Auth0 username/password  
4. `apps/web/.env` already has Auth0 SPA client vars (`VITE_AUTH0_*`, `VITE_API_BASE_URL`)

```bash
pnpm --filter @bookmark-manager/web test:e2e
```

Expected: PASS (1 passed). If Auth0 UI selectors miss, adjust **only** `auth.helper.ts` and re-run.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/smoke.spec.ts
git commit -m "$(cat <<'EOF'
test(web): Auth0 smoke e2e for create collection and bookmark

EOF
)"
```

Never commit `apps/web/e2e/.env`.

---

### Task 4: README note + final verification

**Files:**
- Modify: `README.md` (Verification / Tests section only)

**Interfaces:**
- Consumes: scripts and env layout from Tasks 1–3

- [ ] **Step 1: Document web e2e in README**

Near the Verification section (after `pnpm test` / Tests bullets), add:

```markdown
**Web Playwright (opt-in):** requires API + Postgres up, Auth0 SPA env in `apps/web/.env`, and credentials in `apps/web/e2e/.env` (see `apps/web/e2e/.env.example`). Then:

```bash
pnpm --filter @bookmark-manager/web test:e2e
```

Not part of default `pnpm test` (needs real Auth0 user secrets).
```

Also update the “Deferred: Auth0 interactive UI smoke…” line under Scope to note Playwright smoke exists as opt-in (still not in default CI without secrets).

- [ ] **Step 2: Confirm default test suite unchanged**

```bash
grep -n 'test:' package.json apps/web/package.json
```

Expected: root `test` still API unit + API e2e + web vitest only; web `test:e2e` separate.

- [ ] **Step 3: Final smoke re-run (if credentials available)**

```bash
pnpm --filter @bookmark-manager/web test:e2e
```

Expected: PASS. If the implementer has no Auth0 credentials, document that in the task report as DONE_WITH_CONCERNS and leave RED evidence from Step 2 of Task 3 plus GREEN blocked on secrets.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: document opt-in Playwright Auth0 smoke e2e

EOF
)"
```

Stage only the README hunk for this note if other README edits are dirty.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Playwright under `apps/web` | 1 |
| `e2e/.env` gitignored + `.env.example` | 1 |
| `playwright.config` + Vite `webServer` | 1 |
| Auth0 Universal Login helper + fail-fast credentials | 2 |
| Smoke: login → create collection → create bookmark → logout | 3 |
| Unique names per run | 3 |
| README run instructions; opt-in (not default `pnpm test`) | 4 |
| Out of scope search/share/403/404/ROPG | honored (not in tasks) |

**Placeholder scan:** none. **Type consistency:** `loginAsE2eUser(page: Page)` / `requireE2eCredentials()` used as defined.
