# Product UX Redesign — Design Spec

**Date:** 2026-07-26  
**Scope:** `apps/web` (+ shared `packages/ui` primitives as needed). No API/Prisma/product-feature expansion.  
**Approach:** App shell with Collections | Bookmarks nav + Create menu; create/edit/assign as pages; Share (+ list Assign) as modals; modern clean-light visual.

## 1. Goal

Redesign the bookmark manager UI so browsing is list-first, create actions live in a clear Create menu, collection share is a modal, collection detail shows that collection’s bookmarks with add/delete, and the bookmarks area supports list-first browsing with add/delete/assign plus a dedicated edit form — with a modern, calm visual tone.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Navigation | App shell: **Collections** \| **Bookmarks** + primary **Create ▾** |
| Create menu | New collection → page; New bookmark → page |
| Share | **Modal** only |
| Other forms | Pages (create collection/bookmark, edit bookmark, assign page) |
| Assign | Page at `/bookmarks/:id/assign` **and** assign **modal** from bookmark list row |
| Collection “add item” | Navigate to `/bookmarks/new?collectionId=:id` (pre-selected) |
| Home | `/` → `/collections` |
| Visual | Clean light: soft gray canvas, charcoal type, one teal/blue accent; no purple/cream-terracotta/newspaper looks |
| API | Unchanged privacy rules; reuse Orval hooks |

## 3. App layout (`<App />`)

Every authenticated screen wraps in `App` (not `AppShell`):

- Brand mark / product name (hero-level in the bar, not a weak eyebrow)
- Nav: Collections, Bookmarks (active state on current section)
- **Create ▾**: “New collection” → `/collections/new`; “New bookmark” → `/bookmarks/new`
- User email + Log out (existing Auth0 behavior)
- Soft gray page background; content in a readable max-width column
- Global alert host (success / fail toasts)

Unauthenticated access to `requireAuth` routes is handled by a route-level auth gate (redirect to Auth0 login) — **not** by duplicating login CTAs inside every screen.

Resource failures use dedicated pages:

| Situation | Destination |
| --- | --- |
| Unknown client route (`*`) | `/404` |
| Not invited / no access to a collection or bookmark (API privacy **404**) | `/404` |
| API 403, or viewer opening an owner-only mutate route (edit/assign) | `/403` |

Do **not** inline “not found / no access” condition trees (or auth modals) inside list/detail screens for those cases — navigate to the error page.

**Product rule:** a signed-in user who is **not the owner and not on the collection invite (share) list** must land on **`/404`** when opening that collection (or a bookmark they cannot access) — same as the API privacy response.

## 4. Routes

| Path | Purpose |
| --- | --- |
| `/` | Redirect to `/collections` |
| `/collections` | Collection list |
| `/collections/new` | Create collection page |
| `/collections/:id` | Collection detail = bookmarks in that collection |
| `/bookmarks` | All bookmarks list |
| `/bookmarks/new` | Create bookmark (`?collectionId=` optional) |
| `/bookmarks/:id` | Edit bookmark form |
| `/bookmarks/:id/assign` | Assign bookmark to a collection (page) |
| `/callback` | Auth0 callback (unchanged URL) |
| `/403` | Forbidden |
| `/404` | Not found |
| `*` | Catch-all → `/404` |

Update `src/config/routes.config.tsx` and add thin `src/pages/...` shells that render domain screens.

## 5. Screen behaviors

### 5.1 Collections list (`/collections`)

- List owned + shared collections (existing API).
- Click row / name → `/collections/:id`.
- **Share** (owners only): opens `ShareCollectionModal` (email invite).
- **Delete** (owners only): confirm dialog, then delete; invalidate list.
- Shared caption remains (owned vs shared read-only).
- No inline create form on this page (create via Create menu / `/collections/new`).

### 5.2 Create collection (`/collections/new`)

- Page form: name + submit.
- On success → navigate to `/collections` or `/collections/:id` (prefer detail of created collection if id returned).

### 5.3 Collection detail (`/collections/:id`)

- Header: collection name; subtitle owner vs shared.
- Body: bookmarks belonging to this collection (existing nested or filtered list API).
- **Add bookmark** (owners only) → `/bookmarks/new?collectionId=:id`.
- Delete bookmark from list (owners only) with confirm.
- Shared viewers: read-only list; no add/delete/share.
- Back to collections.

### 5.4 Bookmarks list (`/bookmarks`)

- List all readable bookmarks first (existing list + optional collection filter if already present — keep if low cost, else drop filter for YAGNI in this redesign).
- Row click → `/bookmarks/:id` (edit).
- Actions (owners only): **Delete** (confirm); **Assign** → `AssignBookmarkModal`.
- Add via Create menu or a list-level “New bookmark” linking to `/bookmarks/new`.

### 5.5 Create bookmark (`/bookmarks/new`)

- Fields: url, title, notes, collection select (owned collections only).
- If `collectionId` query present and owned, pre-select it.
- On success → `/bookmarks` or `/collections/:id` when created from a collection context.

### 5.6 Edit bookmark (`/bookmarks/:id`)

- Form for url, title, notes (and optionally collection — or leave collection changes to assign flows to avoid duplication; **prefer** edit form includes collection select for convenience).
- Owners only; non-owners (including shared viewers) navigating here → `/403`. Strangers / not-invited (API privacy 404) → `/404`.

### 5.7 Assign page (`/bookmarks/:id/assign`)

- Choose collection (or none / unassign) and save.
- Same mutation as the assign modal.

### 5.8 Modals

- **ShareCollectionModal:** email field; submit → existing share create; show API errors (including unknown email 404 message); success closes + invalidates shares/list as needed.
- **AssignBookmarkModal:** collection select + save/unassign; opened from bookmarks list row.

## 6. Permissions

Mirror existing API:

| Actor | Collections list | Share / delete collection | Collection bookmarks add/delete | Bookmark mutate / assign |
| --- | --- | --- | --- | --- |
| Owner | yes | yes | yes | yes |
| Shared viewer | yes (shared rows) | no | no | no |
| Stranger (not invited) | no (UI `/404` on direct open; API 404) | — | — | — |

Hide disallowed actions in the UI; do not rely on UI alone for security.

## 7. Visual system

- CSS variables: `--bg` (soft gray), `--surface` (white/elevated), `--ink` (charcoal), `--muted`, `--accent` (teal or blue — pick one and stick to it).
- Typography: expressive pairing (display + body); **not** Inter/Roboto/Arial/system-only.
- Spacing: roomy; one job per section; avoid card grids in the “hero” of each page — lists may use light separators, not heavy card chrome unless needed for interaction.
- Motion (2–3): e.g. modal enter/exit, active nav indicator, subtle list fade-in.
- Avoid: purple-on-white gradients, cream+#terracotta, broadsheet density, glow stacks, emoji decoration.

## 8. Architecture notes

- Keep `src/pages/` thin shells and domain `*Screen` / components / hooks / services / `helpers/`.
- Layout chrome lives in `src/app/App.tsx` (`<App />`) so screens stop duplicating nav/logout.
- **One file = one responsibility.** Lists split into `*List` (map), `*ListItem` (row presentation), `*ListItemActions` (owner actions). Screens compose; they do not own row chrome.
- **Helpers:** pure helpers live in `helpers/*.helper.ts` (domain or `src/lib/helpers/`). Enums stay in `constants/*.constant.ts`. Do not put helper functions inside constant files.
- Reuse `@bookmark-manager/api-client` hooks; invalidate via existing query services.
- Shared UI: Dialog/MenuButton + **`Loading`** + **`NoData`** + alert/toast primitives — reuse everywhere; no duplicated loading/empty Typography blocks.
- Feature flags in `features.config.ts` may gate create/share if already present; defaults remain on.

## 9. Error handling

- Inline field/form errors on page forms only.
- Modal errors stay inside the modal.
- Mutation **success / failure** also fire a global alert (toast) for consistency.
- Loading → shared `<Loading />`; empty lists → shared `<NoData />` (short copy + optional CTA).
- Not invited / no resource access → `/404` (match API privacy). Owner-only mutate as viewer / API 403 → `/403`. Unknown client routes → `/404` (see §3).

## 10. Out of scope

- API contract / Prisma / Auth0 URL changes
- Tags, search, import, FTS, bulk multi-select picker of existing bookmarks into a collection
- Dark mode
- i18n / labels.config

## 11. Success criteria

- `<App />` nav + Create menu works on authenticated pages
- Share is modal; create/edit/assign-page flows work as routes
- Collection detail lists bookmarks; add goes to prefilled create page
- Bookmarks list supports delete + assign modal; click opens edit page
- Shared viewers cannot see mutate actions; **not invited → `/404`**; owner-only mutate as viewer → `/403`; unknown URLs → `/404`
- Loading / NoData / alerts reused consistently; list rows split item vs actions
- Visual matches clean-light direction
- Existing privacy API behavior unchanged; web builds

## 12. Verification

- `pnpm --filter @bookmark-manager/web build`
- Manual: login → create collection → share modal → open collection → add bookmark → bookmarks list → assign modal → edit page → delete
