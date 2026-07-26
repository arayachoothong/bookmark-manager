# Product UI Correction — Search, Detail Pages, Alerts, Many-to-Many

**Date:** 2026-07-26  
**Scope:** `apps/api` (schema + search + membership), `packages/api-client` (Orval regen), `apps/web` (+ `packages/ui` alert placement).  
**Builds on:** [2026-07-26-product-ux-redesign-design.md](./2026-07-26-product-ux-redesign-design.md) (shell, routes, Loading/NoData/alerts, `/403`/`/404`, one-file-one-responsibility).  
**Approach:** Server-side `?q=` search; collection detail becomes an editable page; bookmarks list gains search + collection filter; create/edit share one form; alerts move top-right; bookmarks ↔ collections become many-to-many with both body `collectionIds` and collection membership endpoints.

## 1. Goal

Fix the product UI so lists support real name search, collection detail owns rename/delete plus add-existing/create-new bookmarks, bookmarks list can filter by collection, bookmark create and edit share one form (Description → `notes`), notifications sit top-right like an admin system, and a bookmark can belong to multiple collections.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Search | `?q=` on `GET /collections` (name) and `GET /bookmarks` (title); case-insensitive contains; optional |
| Collection filter | Optional `?collectionId=<uuid>` only; omit param = all. No `unassigned` / `null` sentinel |
| Collection “add item” | **Both:** Add existing (modal) **and** Create new → `/bookmarks/new?collectionId=` |
| Collection rename | Always-visible name field above Bookmarks; Save + Delete beside it (no Edit button) |
| Bookmark ↔ collection | **Many-to-many** join table |
| Membership API | **Both:** `collectionIds` on bookmark create/PUT/PATCH **and** `POST/DELETE` membership on collections |
| Form collections field | Multi-select → `collectionIds` |
| Description label | UI label “Description”; maps to API `notes` |
| Alerts | Top-right, admin-style (bordered, left accent, dismiss) |
| Access / privacy UX | Not invited → UI `/404` (API privacy 404); forbidden mutate → `/403` |
| Visual | Keep clean-light from prior UX redesign |
| Out of scope | Auth0 changes; Share modal behavior beyond staying a modal; labels config |

## 3. API

### 3.1 Schema

New join model (name may be `BookmarkCollection`):

- `bookmarkId` + `collectionId` composite unique / PK
- Cascade delete when either bookmark or collection is deleted

Migration:

1. Create join table  
2. Backfill one join row per existing `Bookmark` that has `collectionId`  
3. Drop `Bookmark.collectionId`  

`BookmarkResponse` exposes `collectionIds: string[]` instead of `collectionId`. Regenerate Orval client after OpenAPI updates.

### 3.2 Privacy (behavior preserved, rule generalized)

| Action | Rule |
| --- | --- |
| Read bookmark | Owner **or** readable on **any** of its collections |
| Mutate bookmark (PUT/PATCH/DELETE) | Owner only; non-owner who can read → **403**; otherwise **404** |
| Add bookmark to collection | Caller owns the bookmark **and** has write access to the collection |
| Remove membership | Same write rules as add (owner of bookmark + writable collection); does **not** delete the bookmark |
| Viewers of shared collection | Read-only; cannot rename/delete collection, add/remove bookmarks |

### 3.3 Search and list filters

**Collections — `GET /collections`**

| Param | Required | Behavior |
| --- | --- | --- |
| `q` | optional | Case-insensitive contains on `name`. Omit = no name filter |

Scope unchanged: collections owned by caller or shared with caller.

**Bookmarks — `GET /bookmarks`**

| Param | Required | Behavior |
| --- | --- | --- |
| `q` | optional | Case-insensitive contains on `title`. Omit = no title filter |
| `collectionId` | optional | When present as a UUID, only bookmarks in that collection (and readable). Omit = no collection filter |

Params are independent and combinable (`?q=design&collectionId=<uuid>`).  
Clients must **omit** unused params (undefined → not in the request). Do **not** send empty `collectionId=` or a `null` sentinel.

Invalid UUID for `collectionId` → **400**.  
Unknown / not-readable collection → **404** (privacy), same as today when filtering by collection.

### 3.4 Bookmark body membership

On `POST /bookmarks`, `PUT /bookmarks/:id`, `PATCH /bookmarks/:id`:

- Accept `collectionIds?: string[]`
- **Replace-the-set** semantics when the field is present
- On PATCH: omit field → leave membership unchanged; send `[]` → clear all memberships
- Every ID in the set must be a collection the caller can write; otherwise fail the whole request (no partial apply)

Other fields unchanged: `url`, `title`, `notes` (UI “Description”).

### 3.5 Collection membership endpoints

| Method | Path | Body / notes |
| --- | --- | --- |
| `POST` | `/collections/:id/bookmarks` | `{ bookmarkIds: string[] }` — idempotent add |
| `DELETE` | `/collections/:id/bookmarks/:bookmarkId` | Removes membership only |

Existing collection PATCH (name) and DELETE stay as today.

### 3.6 Tests

Expand e2e (and unit where useful) for:

- `?q=` on collections and bookmarks  
- Combined `q` + `collectionId`  
- Many-to-many read (readable via any collection)  
- `collectionIds` replace on create/patch  
- Membership POST/DELETE  
- Privacy matrix with multi-collection bookmarks  

## 4. UI screens and flows

Mockups (visual companion session): under `.superpowers/brainstorm/` — `collections-list.html`, `collection-detail-v2.html`, `bookmarks-list.html`, `bookmark-detail.html`.

### 4.1 Collections list (`/collections`)

- Debounced search → `GET /collections?q=`
- Card click → `/collections/:id`
- Owner actions on card: Share (modal), Delete (confirm)
- Viewers: no Share/Delete

### 4.2 Collection detail (`/collections/:id`)

**Owner**

- Always-visible **Name** field above Bookmarks section  
- **Save** (PATCH name) and **Delete** (confirm → delete collection) beside the field — no separate Edit button  
- Bookmarks section:
  - **Add existing** → modal: search caller’s bookmarks, multi-select, exclude already-in-collection, submit → `POST /collections/:id/bookmarks`
  - **Create new** → `/bookmarks/new?collectionId=:id`
  - Row click → `/bookmarks/:id`
  - **Remove** → `DELETE /collections/:id/bookmarks/:bookmarkId` (unassign only)

**Viewer**

- Read-only name + bookmark list; no Save/Delete/Add/Remove

**Access**

- Not invited / not found → navigate to `/404`

### 4.3 Bookmarks list (`/bookmarks`)

- Debounced search → `?q=`
- Collection filter: **All** (omit `collectionId`) or **one collection** (`?collectionId=<uuid>`)
- Card click → `/bookmarks/:id`
- Row actions: Assign (modal), Delete (confirm)
- Action clicks do not navigate

### 4.4 Bookmark create / edit (shared form)

Fields:

1. Title  
2. URL  
3. Description → API `notes`  
4. Collections multi-select → `collectionIds`

| Route | Behavior |
| --- | --- |
| `/bookmarks/new` | Create; optional `?collectionId=` prefills multi-select |
| `/bookmarks/:id` | Same form prefilled; Save via PUT/PATCH; **Delete** on page |

Not found / privacy miss → `/404`. Forbidden mutate → `/403`.

### 4.5 Alerts

- Host in top-right  
- Admin style: surface fill, border, strong left accent, title + message, dismiss  
- Success and failure via existing `useAlert` / `AlertProvider` — reposition + restyle only

### 4.6 Unchanged from prior UX redesign

- `<App />` shell: Collections | Bookmarks | Create ▾  
- Share modal; ConfirmDialog; Loading; NoData  
- Guest `/403` and `/404` pages  
- `helpers/` + `*.helper.ts`; one file, one responsibility; List / ListItem / ListItemActions split  

## 5. Implementation structure

### 5.1 API (order)

1. Prisma migration + backfill + drop `collectionId`  
2. Repository/service updates for join table and privacy-via-any-collection  
3. DTOs/OpenAPI: `collectionIds`, `q`, membership routes  
4. E2E coverage  
5. Orval regen in `packages/api-client`

### 5.2 Web — collections

- Search on list  
- Detail: `CollectionNameForm` (or equivalent single-responsibility component), bookmarks section, `AddExistingBookmarksModal`  
- Membership helpers for add/remove + cache invalidation (extend existing bookmark-query invalidation)

### 5.3 Web — bookmarks

- Search + collection filter on list  
- Shared `BookmarkForm` used by create and edit screens  
- Assign modal kept for quick assignment  

### 5.4 Shared UI

- `AlertToast` / provider: top-right placement + admin chrome  
- Small `useDebouncedValue` (or `*.helper`) for search inputs  

## 6. Non-goals

- Finding “orphan” bookmarks via a special query value  
- Changing Auth0 / login  
- Redesigning Share beyond remaining a modal  
- Client-only search that bypasses the API  

## 7. Success criteria

- Typing in collections/bookmarks search hits the API with `q` and updates the list  
- Collection detail can rename/delete in place and add existing or create new bookmarks  
- Bookmark form create and edit are the same fields; Description persists as `notes`  
- A bookmark can sit in multiple collections; list filter and collection detail stay consistent after assign/remove  
- Alerts appear top-right; access misses still land on `/404` or `/403` as before  
