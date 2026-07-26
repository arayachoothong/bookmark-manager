# Bookmark Field Rename: `notes` → `description`

**Date:** 2026-07-26  
**Scope:** `apps/api` (Prisma + OpenAPI/DTOs + services + seed + unit tests), `packages/api-client` (Orval regen), `apps/web` (bookmark form state).  
**Builds on:** Product UX redesign and UI correction (shared `BookmarkForm`; UI already labels the field **Description**).  
**Approach:** Coordinated hard rename — one migration `RENAME COLUMN`, same property name from DB through API to FE. No dual-read, no `@map` bridge.

## 1. Goal

Use one name, `description`, for the bookmark’s optional free-text field across Prisma, OpenAPI/DTOs, Orval client, seed data, and web form values. Remove the current mismatch where the UI says Description but the contract uses `notes`.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Strategy | Hard rename (Approach 1) |
| Database | Prisma `notes` → `description`; SQL `ALTER TABLE "Bookmark" RENAME COLUMN "notes" TO "description"` |
| API / client / FE | Property name `description` everywhere |
| UI label | Keep **Description** (already correct) |
| Semantics | Unchanged: optional; omit/empty on create; `null` clears on update/patch |
| Search `?q=` | Still title-only; description is not searched |
| Docs | Living contract only (`API_DESIGN.md` / README if they mention `notes` — they currently do not). Do not rewrite historical superpowers specs/plans |
| Out of scope | Collections description field; Auth0; search behavior changes; dual-compat for old `notes` payloads |

## 3. Rename surface

| Layer | Change |
| --- | --- |
| Prisma schema | `Bookmark.notes` → `Bookmark.description` (`String?`) |
| Migration | Rename column only; no value transform |
| OpenAPI models | `BookmarkResponse.notes` → `description` |
| DTOs | `CreateBookmarkDto`, `UpdateBookmarkDto`, `PatchBookmarkDto` |
| Application mappers | Bookmarks + collections services that map bookmark rows to responses |
| Unit fixtures | `bookmarks.service.spec`, `collections.service.spec` |
| Seed | `seed-data.ts` / `seed.ts` field `description` |
| Orval | Regenerate after OpenAPI update |
| Web | `BookmarkFormValues.notes` → `description`; create/edit panels send `description` |

## 4. Migration and rollout

1. Update Prisma schema and add rename migration.  
2. Update DTOs, OpenAPI models, services, specs, seed.  
3. Run `pnpm codegen:api`.  
4. Update web form types and create/edit submit payloads.  
5. Apply migration locally (`prisma migrate deploy` or equivalent); re-seed if needed.  
6. Verify with unit tests, e2e if payloads assert the field, web typecheck/build, and a manual create/edit (fill + clear description).

**Risks:** API started against an unmigrated DB will fail on the renamed column; FE built against a stale Orval client will still send `notes`.

## 5. Success criteria

- No live bookmark contract or form state still uses `notes` for this field.  
- Existing description values survive the rename migration.  
- Create/edit/clear description behavior matches pre-rename `notes` behavior.  
- Generated api-client and web compile against `description`.
