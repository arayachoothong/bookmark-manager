# Web Frontend Structure — Design Spec

**Date:** 2026-07-26  
**Scope:** `apps/web` only (refactor + agent rules). No API, Prisma, or product-feature changes.  
**Approach:** Thin pages + domain modules (Approach 1).

## 1. Goal

Restructure the React web app so route pages live outside domains (Next.js-style URL mirroring), domains own reusable UI/logic with clear folder conventions (`interfaces/`, `constants/` with TypeScript enums, optional `services/`), and routing plus feature flags are config-driven. UI copy stays inline in components/screens (no labels config). Encode the same conventions in Cursor and dual-agent docs so future work stays consistent.

**Non-goals:** URL redesign, Auth0 callback path changes, visual redesign, form-schema frameworks, API changes.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Pages | `src/pages/<route>/` mirroring route segments; domains have no `pages/` |
| Interfaces | Per-domain `interfaces/*.interface.ts` (UI/view models only) |
| Enums | TypeScript `enum` in files named `*.constant.ts` under `constants/` |
| Config | Routes + feature toggles under `src/config/`; UI copy stays inline in components/screens |
| Auth | Callback page under `pages/auth/callback/`; providers stay in `src/app/providers/` |
| Domains | Allowed: `components/`, `hooks/`, `interfaces/`, `constants/`, `services/`, optional `utils/` |
| Deliverable | Refactor existing web + encode rules in Cursor/agent docs |
| Orval | Generated types remain in `@bookmark-manager/api-client`; do not duplicate as local interfaces |

## 3. Target layout

```
apps/web/src/
  app/
    providers/              # Auth0, Query, theme
    AppRouter.tsx           # reads routes.config
  pages/
    auth/callback/index.tsx
    collections/index.tsx
    collections/[id]/index.tsx
    bookmarks/index.tsx
    bookmarks/[id]/index.tsx
  config/
    routes.config.ts
    features.config.ts
  domains/
    auth/                   # hooks (+ constants/interfaces if needed); no pages
    collections/            # components, hooks, interfaces, constants, services, utils?
    bookmarks/              # same
  lib/                      # http and other cross-cutting helpers
```

**Placement rules**

- **Pages:** route shells only. Import domain screens/components; no business logic beyond wiring params.
- **Domains:** no `pages/`. Prefer `*Screen` components for former page bodies.
- **Config:** single source for paths, auth requirements, and feature flags. Copy stays colocated with UI.
- **lib/:** cross-cutting only (e.g. API client token wiring); not domain-specific.

## 4. Config & routing

### 4.1 `routes.config.ts`

Declarative entries shaped like `{ path, element, requireAuth }`. `AppRouter` maps the list into React Router `<Routes>` inside existing `BrowserRouter` + `AppProviders`.

**Public URLs stay unchanged** (Auth0 and bookmarks must keep working):

| Path | Page file |
| --- | --- |
| `/` | redirect to `/collections` |
| `/collections` | `pages/collections/index.tsx` |
| `/collections/:id` | `pages/collections/[id]/index.tsx` |
| `/bookmarks` | `pages/bookmarks/index.tsx` |
| `/bookmarks/:id` | `pages/bookmarks/[id]/index.tsx` |
| `/callback` | `pages/auth/callback/index.tsx` |

Folder layout may use `auth/callback` for organization; the **URL remains `/callback`**.

### 4.2 `features.config.ts`

Boolean toggles for optional UI (e.g. share form, create forms). Defaults preserve current behavior (`true` for existing features). Components gate on flags; this refactor does not delete feature code behind flags.

### 4.3 Auth

- Providers remain in `app/providers/`.
- Callback page handles Auth0 redirect only.
- Token readiness hook stays in `domains/auth/hooks/`.

## 5. Domains, thin pages, services

### 5.1 Thin pages + screens

Move current page bodies (e.g. `CollectionsPage`) into domain screen components:

- `pages/collections/index.tsx` → renders `<CollectionsScreen />`
- `domains/collections/components/CollectionsScreen.tsx` owns session gate, queries, mutations, layout

Apply the same pattern to collection detail, bookmarks list/detail, and auth callback (callback stays thin).

### 5.2 Interfaces & constants

- `*.interface.ts`: UI props and local view models only.
- Do not re-declare Orval/OpenAPI DTOs.
- `*.constant.ts`: TypeScript `enum` values (naming says “constant”; implementation uses `enum`).

### 5.3 Services

Optional thin wrappers over Orval for repeated query options, invalidation, or mapping. Hooks may call services; UI components do not call Axios/http directly.

### 5.4 Cross-domain imports

`domains/auth` may be imported by collections/bookmarks. No circular imports between domains.

**Empty folders:** create `interfaces/`, `constants/`, `services/`, or `utils/` only when a real file lands—no empty scaffolding.

## 6. Migration plan

Behavior-preserving refactor:

1. Add `src/config/` (`routes`, `features`).
2. Add `src/pages/` shells; move page bodies into domain `*Screen` components.
3. Delete `domains/*/pages/`.
4. Point `AppRouter` at `routes.config.ts`.
5. Add interfaces/constants/services only where they reduce duplication or clarify types.
6. Encode conventions in `.cursor/rules/` plus `CLAUDE.md` / `AGENTS.md` (and living stubs if they describe web layout).
7. Verify: typecheck/build; manual smoke login → collections → share → bookmarks; Auth0 `/callback` unchanged.

## 7. Agent rules to encode

Document for both Cursor and Claude/agents:

- Pages live under `src/pages/`; domains never contain `pages/`.
- Domain allowed subfolders and naming: `*.interface.ts`, `*.constant.ts` (enums).
- Config ownership: routes and features under `src/config/`; do not invent a labels/i18n layer — keep copy inline.
- Orval types from `@bookmark-manager/api-client` only; local interfaces are UI-only.
- Thin pages + domain screens pattern.
- Public URLs must not change without an explicit Auth0/docs update.

## 8. Out of scope

- `apps/api`, Prisma, Docker, `packages/ui` redesign
- New product features
- Changing Auth0 redirect URI / public paths
- Visual/UI redesign
- Config-driven form schemas or query-key factory frameworks

## 9. Verification

- `apps/web` typechecks and builds after the move
- Manual happy path: login → collections CRUD/share UI → bookmarks
- No new e2e suite required for a pure structure move unless behavior regresses

## 10. Success criteria

- URL-mirrored `src/pages/` with no `domains/*/pages/`
- Config-driven router + feature toggles; copy stays inline
- Domains follow allowed folder/naming conventions
- Agent rules updated so a fresh session places new UI files correctly
- Existing product behavior and Auth0 callback path preserved
