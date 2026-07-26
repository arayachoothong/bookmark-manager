# Web Frontend Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `apps/web` so routes live under `src/pages/`, domains own screens/hooks/interfaces/constants/services (no `pages/`), and routing/labels/feature flags are config-driven — then encode the same conventions in agent rules.

**Architecture:** Thin page shells under `src/pages/<route>/` render domain `*Screen` components. `src/config/` owns routes, labels, and feature toggles. `AppRouter` maps `routes.config.tsx` into React Router. Auth0 providers stay in `src/app/providers/`; public URLs (including `/callback`) do not change.

**Tech Stack:** React 19, Vite 6, React Router 8, Auth0 React SDK, TanStack Query, MUI, Tailwind, `@bookmark-manager/api-client` (Orval), `@bookmark-manager/ui`, TypeScript strict

## Global Constraints

- Workspace (worktree): `/Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app`
- Spec: `docs/superpowers/specs/2026-07-26-web-frontend-structure-design.md`
- **Scope:** `apps/web` + agent docs only — no API/Prisma/UI package redesign, no new product features, no Auth0 URL changes
- **Public URLs unchanged:** `/`, `/collections`, `/collections/:id`, `/bookmarks`, `/bookmarks/:id`, `/callback`
- **Pages:** `src/pages/`; domains never contain `pages/`
- **Naming:** `*.interface.ts` for UI props; TypeScript `enum` in `*.constant.ts` under `constants/`
- **Config:** `src/config/{routes,labels,features}.config.*`
- **Orval:** no hand-copied DTOs; local interfaces are UI-only
- **Empty folders:** create `interfaces/`, `constants/`, `services/`, `utils/` only when a real file lands
- **Verification:** `pnpm --filter @bookmark-manager/web build` after each structural task (web has no unit test runner; this is a pure structure move per the takehome TDD scaffolding exception)
- **Commits:** Conventional Commits — `refactor(web): …`, `docs(agent): …`, etc.
- **Public naming:** never mention employer/bank brand names in docs/commits/UI

## File map

| Path | Responsibility |
|------|----------------|
| `apps/web/src/config/labels.config.ts` | Screen titles, empty states, button copy |
| `apps/web/src/config/features.config.ts` | Feature toggles (`createCollection`, `shareCollection`, `createBookmark`) |
| `apps/web/src/config/routes.config.tsx` | `{ path, element, requireAuth }[]` for AppRouter |
| `apps/web/src/config/app-route.interface.ts` | `AppRouteConfig` UI interface |
| `apps/web/src/pages/**/index.tsx` | Thin route shells |
| `apps/web/src/domains/*/components/*Screen.tsx` | Former page bodies |
| `apps/web/src/domains/*/interfaces/*.interface.ts` | Component prop interfaces |
| `apps/web/src/domains/*/constants/*.constant.ts` | Access-role enums |
| `apps/web/src/domains/collections/services/collections-query.service.ts` | Invalidate helpers over Orval keys |
| `apps/web/src/app/AppRouter.tsx` | BrowserRouter + providers + map routes config |
| `.cursor/rules/web-frontend-structure.mdc` | Cursor rule for web layout |
| `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/bookmark-manager.mdc` | Update web folder convention lines |
| `DECISIONS.md` | ADR for thin pages + config-driven web |

**Delete after move:**

- `apps/web/src/domains/auth/pages/CallbackPage.tsx`
- `apps/web/src/domains/collections/pages/CollectionsPage.tsx`
- `apps/web/src/domains/collections/pages/CollectionDetailPage.tsx`
- `apps/web/src/domains/bookmarks/pages/BookmarksPage.tsx`
- `apps/web/src/domains/bookmarks/pages/BookmarkDetailPage.tsx`

---

### Task 1: Config — labels, features, route interface

**Files:**
- Create: `apps/web/src/config/labels.config.ts`
- Create: `apps/web/src/config/features.config.ts`
- Create: `apps/web/src/config/app-route.interface.ts`
- Modify: `apps/web/src/domains/collections/components/CollectionsList.tsx`
- Modify: `apps/web/src/domains/collections/components/CreateCollectionForm.tsx`
- Modify: `apps/web/src/domains/collections/components/ShareCollectionForm.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/BookmarksList.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/CreateBookmarkForm.tsx`

**Interfaces:**
- Consumes: existing hardcoded copy in list/form components
- Produces: `labels`, `features`, `AppRouteConfig` for later tasks

- [ ] **Step 1: Create `app-route.interface.ts`**

```ts
import type { ReactNode } from "react";

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
  requireAuth: boolean;
}
```

- [ ] **Step 2: Create `labels.config.ts`**

```ts
export const labels = {
  collections: {
    title: "Collections",
    empty: "No collections yet. Create one above.",
    ownedByYou: "Owned by you",
    sharedReadOnly: "Shared with you (read-only)",
    youOwn: "You own this collection",
    sharedWithYou: "Shared with you (read-only)",
    loadingSession: "Loading session…",
    loadingList: "Loading collections…",
    loadingAccount: "Loading account…",
    loadListError: "Could not load collections.",
    loadAccountError: "Could not load account.",
    notFound: "Collection not found or you do not have access.",
    missingId: "Missing collection id.",
    back: "Back",
    backToList: "Back to collections",
    delete: "Delete",
    deleteCollection: "Delete collection",
    peopleWithAccess: "People with access",
    loadingShares: "Loading shares…",
    loadSharesError: "Could not load shares.",
    notSharedYet: "Not shared with anyone yet.",
    updatedPrefix: "Updated",
  },
  bookmarks: {
    title: "Bookmarks",
    empty: "No bookmarks yet. Create one above.",
    ownedByYou: "Owned by you",
    sharedReadOnly: "Shared collection (read-only)",
    youOwn: "You own this bookmark",
    sharedWithYou: "Shared collection (read-only)",
    loadingSession: "Loading session…",
    loadingList: "Loading bookmarks…",
    loadingAccount: "Loading account…",
    loadListError: "Could not load bookmarks.",
    loadAccountError: "Could not load account.",
    notFound: "Bookmark not found or you do not have access.",
    missingId: "Missing bookmark id.",
    back: "Back",
    backToList: "Back to bookmarks",
    delete: "Delete",
    deleteBookmark: "Delete bookmark",
    url: "URL",
    notes: "Notes",
    collection: "Collection",
    viewCollection: "View collection",
    notInCollection: "Not in a collection",
    updatedPrefix: "Updated",
    navCollections: "Collections",
  },
  auth: {
    logIn: "Log in",
    logOut: "Log out",
    completingSignIn: "Completing sign-in…",
    loginFailedPrefix: "Login failed:",
  },
  share: {
    submit: "Share",
    success: "Share invite sent.",
  },
  common: {
    collectionTitle: "Collection",
    bookmarkTitle: "Bookmark",
  },
} as const;
```

- [ ] **Step 3: Create `features.config.ts`**

```ts
export const features = {
  createCollection: true,
  shareCollection: true,
  createBookmark: true,
} as const;
```

- [ ] **Step 4: Wire labels + feature gates into list/form components**

In `CollectionsList.tsx`: import `labels` from `../../../config/labels.config`; replace empty/owned/shared strings with `labels.collections.*`; replace Delete button text with `labels.collections.delete`.

In `BookmarksList.tsx`: same pattern with `labels.bookmarks.*`.

In `CreateCollectionForm.tsx`: wrap the form return in `features.createCollection ? (…) : null` (import `features` from `../../../config/features.config`). Keep existing form internals.

In `ShareCollectionForm.tsx`: early-return `null` when `!features.shareCollection`; use `labels.share.submit` / `labels.share.success` for button and success copy.

In `CreateBookmarkForm.tsx`: early-return `null` when `!features.createBookmark`.

- [ ] **Step 5: Verify build**

Run:

```bash
pnpm --filter @bookmark-manager/web build
```

Expected: exit 0 (tsc + vite build succeed).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/config apps/web/src/domains/collections/components apps/web/src/domains/bookmarks/components
git commit -m "$(cat <<'EOF'
refactor(web): add labels/features config and wire into forms

Centralize UI copy and feature toggles under src/config before the pages move.
EOF
)"
```

---

### Task 2: Collections — constants, interfaces, service, screens, pages

**Files:**
- Create: `apps/web/src/domains/collections/constants/collection-access.constant.ts`
- Create: `apps/web/src/domains/collections/interfaces/collections-list.interface.ts`
- Create: `apps/web/src/domains/collections/services/collections-query.service.ts`
- Modify: `apps/web/src/domains/collections/hooks/useCollectionsQuery.ts`
- Create: `apps/web/src/domains/collections/components/CollectionsScreen.tsx`
- Create: `apps/web/src/domains/collections/components/CollectionDetailScreen.tsx`
- Create: `apps/web/src/pages/collections/index.tsx`
- Create: `apps/web/src/pages/collections/[id]/index.tsx`
- Modify: `apps/web/src/domains/collections/components/CollectionsList.tsx`
- Modify: `apps/web/src/app/AppRouter.tsx` (temporary dual import — pages + still-old bookmarks/auth until Task 4/5)
- Keep old `domains/collections/pages/*` until Step 6 of this task deletes them after AppRouter points at new pages for collections only

**Interfaces:**
- Consumes: `labels`, `features`, current `CollectionsPage` / `CollectionDetailPage` bodies, `useCollectionsQuery`
- Produces: `CollectionsScreen`, `CollectionDetailScreen`, page shells, `CollectionAccessRole`, `CollectionsListProps`, `createCollectionsQueryService`

- [ ] **Step 1: Add access-role constant (TypeScript enum)**

```ts
// apps/web/src/domains/collections/constants/collection-access.constant.ts
export enum CollectionAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}

export function collectionAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): CollectionAccessRole {
  return currentUserId === ownerId
    ? CollectionAccessRole.Owner
    : CollectionAccessRole.Viewer;
}
```

- [ ] **Step 2: Extract list props interface**

```ts
// apps/web/src/domains/collections/interfaces/collections-list.interface.ts
import type { CollectionResponse } from "@bookmark-manager/api-client";

export interface CollectionsListProps {
  collections: CollectionResponse[];
  currentUserId?: string;
  deletingId?: string;
  onDelete: (id: string) => void;
}
```

Update `CollectionsList.tsx` to import `CollectionsListProps` from that file (remove local type). Use `collectionAccessRole` + `CollectionAccessRole` when choosing owned vs shared label:

```ts
const role = collectionAccessRole(currentUserId, collection.ownerId);
const caption =
  role === CollectionAccessRole.Owner
    ? labels.collections.ownedByYou
    : labels.collections.sharedReadOnly;
```

- [ ] **Step 3: Add collections query service; thin the hook**

```ts
// apps/web/src/domains/collections/services/collections-query.service.ts
import {
  getCollectionsControllerGetOneQueryKey,
  getCollectionsControllerListQueryKey,
  getSharesControllerListQueryKey,
} from "@bookmark-manager/api-client";
import type { QueryClient } from "@tanstack/react-query";

export function createCollectionsQueryService(queryClient: QueryClient) {
  return {
    invalidateCollectionsList: () =>
      queryClient.invalidateQueries({
        queryKey: getCollectionsControllerListQueryKey(),
      }),
    invalidateCollection: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: getCollectionsControllerGetOneQueryKey(id),
      }),
    invalidateShares: (collectionId: string) =>
      queryClient.invalidateQueries({
        queryKey: getSharesControllerListQueryKey(collectionId),
      }),
  };
}
```

```ts
// apps/web/src/domains/collections/hooks/useCollectionsQuery.ts
import { useQueryClient } from "@tanstack/react-query";

import { createCollectionsQueryService } from "../services/collections-query.service";

export function useCollectionsQuery() {
  const queryClient = useQueryClient();
  return createCollectionsQueryService(queryClient);
}
```

- [ ] **Step 4: Create `CollectionsScreen.tsx`**

Move the body of `domains/collections/pages/CollectionsPage.tsx` into `CollectionsScreen` (rename export). Replace hardcoded strings with `labels.collections.*` / `labels.auth.*`. Gate `<CreateCollectionForm />` is already handled inside the form via features; keep rendering `<CreateCollectionForm />` as today.

Export: `export function CollectionsScreen()`.

- [ ] **Step 5: Create `CollectionDetailScreen.tsx`**

Move body of `CollectionDetailPage.tsx` into `CollectionDetailScreen`. Use `labels` for all user-visible strings. Use `collectionAccessRole` for owner vs viewer subtitle. Keep `ShareCollectionForm` / delete UI for owners only (feature flag already inside share form).

- [ ] **Step 6: Create thin pages and point AppRouter collections routes at them**

```tsx
// apps/web/src/pages/collections/index.tsx
import { CollectionsScreen } from "../../domains/collections/components/CollectionsScreen";

export function CollectionsPage() {
  return <CollectionsScreen />;
}
```

```tsx
// apps/web/src/pages/collections/[id]/index.tsx
import { CollectionDetailScreen } from "../../../domains/collections/components/CollectionDetailScreen";

export function CollectionDetailPage() {
  return <CollectionDetailScreen />;
}
```

Update `AppRouter.tsx` imports for collections only:

```tsx
import { CollectionDetailPage } from "../pages/collections/[id]";
import { CollectionsPage } from "../pages/collections";
```

Delete:

- `apps/web/src/domains/collections/pages/CollectionsPage.tsx`
- `apps/web/src/domains/collections/pages/CollectionDetailPage.tsx`

- [ ] **Step 7: Verify build**

```bash
pnpm --filter @bookmark-manager/web build
```

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/collections apps/web/src/domains/collections apps/web/src/app/AppRouter.tsx
git add -u apps/web/src/domains/collections/pages
git commit -m "$(cat <<'EOF'
refactor(web): move collections pages to screens and src/pages

Extract collection screens, interfaces, access constants, and query service; delete domain pages.
EOF
)"
```

---

### Task 3: Bookmarks — interfaces, screens, pages

**Files:**
- Create: `apps/web/src/domains/bookmarks/constants/bookmark-access.constant.ts`
- Create: `apps/web/src/domains/bookmarks/interfaces/bookmarks-list.interface.ts`
- Create: `apps/web/src/domains/bookmarks/components/BookmarksScreen.tsx`
- Create: `apps/web/src/domains/bookmarks/components/BookmarkDetailScreen.tsx`
- Create: `apps/web/src/pages/bookmarks/index.tsx`
- Create: `apps/web/src/pages/bookmarks/[id]/index.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/BookmarksList.tsx`
- Modify: `apps/web/src/app/AppRouter.tsx`
- Delete: `apps/web/src/domains/bookmarks/pages/*`

**Interfaces:**
- Consumes: current bookmark pages, `labels`
- Produces: `BookmarksScreen`, `BookmarkDetailScreen`, page shells, `BookmarkAccessRole`, `BookmarksListProps`

- [ ] **Step 1: Add bookmark access constant**

```ts
// apps/web/src/domains/bookmarks/constants/bookmark-access.constant.ts
export enum BookmarkAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}

export function bookmarkAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): BookmarkAccessRole {
  return currentUserId === ownerId
    ? BookmarkAccessRole.Owner
    : BookmarkAccessRole.Viewer;
}
```

- [ ] **Step 2: Extract `BookmarksListProps` interface**

```ts
// apps/web/src/domains/bookmarks/interfaces/bookmarks-list.interface.ts
import type { BookmarkResponse } from "@bookmark-manager/api-client";

export interface BookmarksListProps {
  bookmarks: BookmarkResponse[];
  currentUserId?: string;
  deletingId?: string;
  onDelete: (id: string) => void;
}
```

Update `BookmarksList.tsx` to import it and use `bookmarkAccessRole` + labels (already wired in Task 1 for empty/owned strings).

- [ ] **Step 3: Create screens from current pages**

Move `BookmarksPage` → `BookmarksScreen`; move `BookmarkDetailPage` → `BookmarkDetailScreen`. Replace remaining hardcoded strings with `labels.bookmarks.*` / `labels.auth.*` / `labels.common.*`.

- [ ] **Step 4: Thin pages + AppRouter**

```tsx
// apps/web/src/pages/bookmarks/index.tsx
import { BookmarksScreen } from "../../domains/bookmarks/components/BookmarksScreen";

export function BookmarksPage() {
  return <BookmarksScreen />;
}
```

```tsx
// apps/web/src/pages/bookmarks/[id]/index.tsx
import { BookmarkDetailScreen } from "../../../domains/bookmarks/components/BookmarkDetailScreen";

export function BookmarkDetailPage() {
  return <BookmarkDetailScreen />;
}
```

Point `AppRouter` bookmarks imports at `../pages/bookmarks` and `../pages/bookmarks/[id]`. Delete `domains/bookmarks/pages/*`.

- [ ] **Step 5: Verify build**

```bash
pnpm --filter @bookmark-manager/web build
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/bookmarks apps/web/src/domains/bookmarks apps/web/src/app/AppRouter.tsx
git add -u apps/web/src/domains/bookmarks/pages
git commit -m "$(cat <<'EOF'
refactor(web): move bookmarks pages to screens and src/pages

Extract bookmark screens, list interface, and access constants; delete domain pages.
EOF
)"
```

---

### Task 4: Auth callback page + config-driven AppRouter

**Files:**
- Create: `apps/web/src/pages/auth/callback/index.tsx`
- Create: `apps/web/src/config/routes.config.tsx`
- Modify: `apps/web/src/app/AppRouter.tsx`
- Delete: `apps/web/src/domains/auth/pages/CallbackPage.tsx`

**Interfaces:**
- Consumes: `AppRouteConfig`, page components from Tasks 2–3, current `CallbackPage` body
- Produces: `appRoutes`, config-driven `AppRouter`, callback under `pages/auth/callback/` with URL still `/callback`

- [ ] **Step 1: Create callback page shell**

Move `CallbackPage` body into the page file (callback stays thin — no separate screen required). Use `labels.auth.*` for copy:

```tsx
// apps/web/src/pages/auth/callback/index.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { CircularProgress, Typography } from "@mui/material";
import { Stack } from "@bookmark-manager/ui";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import { labels } from "../../../config/labels.config";

export function CallbackPage() {
  const { error, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !error) {
      navigate("/collections", { replace: true });
    }
  }, [error, isAuthenticated, isLoading, navigate]);

  if (error) {
    return (
      <Stack className="min-h-screen items-center justify-center p-6">
        <Typography color="error" variant="body1">
          {labels.auth.loginFailedPrefix} {error.message}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack className="min-h-screen items-center justify-center gap-4">
      <CircularProgress size={32} />
      <Typography variant="body2">{labels.auth.completingSignIn}</Typography>
    </Stack>
  );
}
```

- [ ] **Step 2: Create `routes.config.tsx`**

```tsx
import { Navigate } from "react-router";

import type { AppRouteConfig } from "./app-route.interface";
import { CallbackPage } from "../pages/auth/callback";
import { BookmarkDetailPage } from "../pages/bookmarks/[id]";
import { BookmarksPage } from "../pages/bookmarks";
import { CollectionDetailPage } from "../pages/collections/[id]";
import { CollectionsPage } from "../pages/collections";

export const appRoutes: AppRouteConfig[] = [
  {
    path: "/",
    element: <Navigate to="/collections" replace />,
    requireAuth: false,
  },
  {
    path: "/collections",
    element: <CollectionsPage />,
    requireAuth: true,
  },
  {
    path: "/collections/:id",
    element: <CollectionDetailPage />,
    requireAuth: true,
  },
  {
    path: "/bookmarks",
    element: <BookmarksPage />,
    requireAuth: true,
  },
  {
    path: "/bookmarks/:id",
    element: <BookmarkDetailPage />,
    requireAuth: true,
  },
  {
    path: "/callback",
    element: <CallbackPage />,
    requireAuth: false,
  },
];
```

Note: `requireAuth` is declarative metadata for agents/future guards. **Do not** add a new auth wrapper in this task — screens keep their existing Auth0 login gates (behavior-preserving).

- [ ] **Step 3: Rewrite `AppRouter.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from "react-router";

import { appRoutes } from "../config/routes.config";
import { AppProviders } from "./providers/AppProviders";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          {appRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Delete auth domain page**

Delete `apps/web/src/domains/auth/pages/CallbackPage.tsx` (and empty `pages/` folder if present). Confirm no remaining `domains/**/pages/**` files:

```bash
find apps/web/src/domains -type d -name pages
```

Expected: no output (or empty dirs only — remove empty dirs).

- [ ] **Step 5: Verify build + path sanity**

```bash
pnpm --filter @bookmark-manager/web build
rg -n "path: \"/callback\"" apps/web/src/config/routes.config.tsx
```

Expected: build exit 0; `/callback` present (not `/auth/callback`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/auth apps/web/src/config/routes.config.tsx apps/web/src/app/AppRouter.tsx
git add -u apps/web/src/domains/auth/pages
git commit -m "$(cat <<'EOF'
refactor(web): drive AppRouter from routes config and move callback page

Keep public /callback URL; remove remaining domain pages folders.
EOF
)"
```

---

### Task 5: Agent rules + decision log

**Files:**
- Create: `.cursor/rules/web-frontend-structure.mdc`
- Modify: `CLAUDE.md` (Engineering domain-folders bullet)
- Modify: `AGENTS.md` (same bullet)
- Modify: `.cursor/rules/bookmark-manager.mdc` (Engineering domain-folders bullet)
- Modify: `DECISIONS.md` (append ADR)

**Interfaces:**
- Consumes: approved structure from the design spec
- Produces: dual-agent + Cursor guidance matching the new layout

- [ ] **Step 1: Create Cursor web-structure rule**

```md
---
description: apps/web folder layout — pages vs domains, config, naming
globs: apps/web/**/*
alwaysApply: false
---

# Web frontend structure

## Layout
- Routes live under `apps/web/src/pages/<route>/` (URL-mirrored folders). Domains **never** contain `pages/`.
- Thin pages render domain `*Screen` components under `domains/<domain>/components/`.
- Providers stay in `src/app/providers/`. `AppRouter` reads `src/config/routes.config.tsx`.
- Cross-cutting HTTP helpers stay in `src/lib/`.

## Domains may contain
`components/`, `hooks/`, `interfaces/`, `constants/`, `services/`, optional `utils/` — create a folder only when a file lands.

## Naming
- UI props / view models: `*.interface.ts` under `interfaces/`.
- TypeScript `enum` values: `*.constant.ts` under `constants/` (file says constant; use `enum`).
- Do **not** duplicate Orval/OpenAPI DTOs; import from `@bookmark-manager/api-client`.

## Config
- `src/config/routes.config.tsx` — `{ path, element, requireAuth }`
- `src/config/labels.config.ts` — UI copy
- `src/config/features.config.ts` — feature toggles
- Public URLs must not change without an explicit Auth0 + docs update (`/callback` stays `/callback`).
```

- [ ] **Step 2: Update shared agent mirrors**

In `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/bookmark-manager.mdc`, replace the web folder clause:

Old:

```text
web `src/domains/<domain>/{components,hooks,pages}` + `app` + `lib`
```

New:

```text
web `src/pages/<route>/` + `src/domains/<domain>/{components,hooks,interfaces,constants,services,utils?}` + `src/config/` + `app` + `lib` (domains never contain `pages/`)
```

- [ ] **Step 3: Append ADR to `DECISIONS.md`**

```md
## ADR: Thin pages + config-driven web structure (2026-07-26)

- **Decision:** Move route entrypoints to `apps/web/src/pages/`; keep domain logic in screens/hooks/services; drive router/labels/features from `src/config/`.
- **Why:** Clear Next-like mental model, tighter domain boundaries, agent-friendly placement rules without changing product URLs.
- **Consequences:** Page files are shells; Auth0 callback file path may use `pages/auth/callback` while URL remains `/callback`.
```

- [ ] **Step 4: Commit**

```bash
git add .cursor/rules/web-frontend-structure.mdc .cursor/rules/bookmark-manager.mdc CLAUDE.md AGENTS.md DECISIONS.md
git commit -m "$(cat <<'EOF'
docs(agent): encode web pages-vs-domains structure rules

Mirror thin pages, config ownership, and naming conventions for Cursor and dual agents.
EOF
)"
```

---

### Task 6: Final verification

**Files:**
- None (verify only); fix only if build/smoke fails

**Interfaces:**
- Consumes: Tasks 1–5 deliverables
- Produces: confirmed green build + structure checklist

- [ ] **Step 1: Structure checklist**

```bash
test ! -d apps/web/src/domains/collections/pages
test ! -d apps/web/src/domains/bookmarks/pages
test ! -d apps/web/src/domains/auth/pages
test -f apps/web/src/pages/collections/index.tsx
test -f apps/web/src/pages/collections/\[id\]/index.tsx
test -f apps/web/src/pages/bookmarks/index.tsx
test -f apps/web/src/pages/bookmarks/\[id\]/index.tsx
test -f apps/web/src/pages/auth/callback/index.tsx
test -f apps/web/src/config/routes.config.tsx
test -f apps/web/src/config/labels.config.ts
test -f apps/web/src/config/features.config.ts
test -f .cursor/rules/web-frontend-structure.mdc
```

Expected: all `test` commands exit 0.

- [ ] **Step 2: Production build**

```bash
pnpm --filter @bookmark-manager/web build
```

Expected: exit 0.

- [ ] **Step 3: Manual smoke (when Auth0 + API available)**

1. Open `http://localhost:3000` → redirects to `/collections`
2. Log in → lands via `/callback` → `/collections`
3. Create collection; open detail; share form visible for owner
4. Open `/bookmarks`; create/filter/delete as owner
5. Confirm no console import errors

If env is unavailable, note skipped smoke in the commit message body or leave a short note in the PR — do not invent Auth0 credentials.

- [ ] **Step 4: Commit only if Step 3 required fixes**

If no code changes, skip commit. If fixes landed:

```bash
git add -A apps/web
git commit -m "$(cat <<'EOF'
fix(web): address structure refactor verification issues

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `src/pages/` URL-mirrored; no domain `pages/` | 2, 3, 4 |
| Per-domain `*.interface.ts` | 2, 3 |
| `enum` in `*.constant.ts` | 2, 3 |
| Config: routes + labels + features | 1, 4 |
| Auth callback in `pages/auth/callback/`; providers unchanged | 4 |
| Domains allow components/hooks/interfaces/constants/services/utils | 2 (utils optional — not required) |
| Thin pages + `*Screen` | 2, 3 |
| Services over Orval where useful | 2 (`collections-query.service`) |
| Orval types not duplicated | 1–3 (interfaces are props only) |
| Agent rules Cursor + CLAUDE/AGENTS | 5 |
| URLs including `/callback` unchanged | 4 |
| Build verification | 1–4, 6 |
| No API/product/visual scope creep | Global constraints |

**Placeholder scan:** none intentional.  
**Type consistency:** `AppRouteConfig`, `labels`, `features`, `CollectionAccessRole`, `BookmarkAccessRole`, `CollectionsListProps`, `BookmarksListProps`, `createCollectionsQueryService` names are stable across tasks.
