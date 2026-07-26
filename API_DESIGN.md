# API Design

Living document aligned with Nest Swagger / OpenAPI (`openapi/openapi.json`) and `@bookmark-manager/api-client`.

**Auth:** All routes except Swagger UI (dev) require `Authorization: Bearer <access_token>`. Missing/invalid token → **401**.

## Resources

| Method | Path | Success | Notes |
|--------|------|---------|-------|
| GET | `/me` | 200 `UserMeResponse` | Upserts user from JWT on first authenticated request |
| GET | `/collections` | 200 `CollectionResponse[]` | Owned + shared collections |
| GET | `/collections/:id` | 200 / 404 | 404 if not readable |
| POST | `/collections` | 200 | Body: `{ name }` |
| PUT/PATCH | `/collections/:id` | 200 / 403 / 404 | Owner-only write |
| DELETE | `/collections/:id` | 200 | Owner-only; cascades shares; bookmarks `collectionId` → null |
| GET | `/collections/:id/bookmarks` | 200 `BookmarkResponse[]` | Readable collection |
| GET | `/bookmarks` | 200 `BookmarkResponse[]` | Optional `?collectionId=` filter (must be readable) |
| GET | `/bookmarks/:id` | 200 / 404 | Owner or readable collection member |
| POST | `/bookmarks` | 200 | Optional `collectionId` (writable) |
| PUT/PATCH | `/bookmarks/:id` | 200 / 403 / 404 | Owner-only mutate; grantee read → **403** |
| DELETE | `/bookmarks/:id` | 200 | Owner-only |
| POST | `/collections/:collectionId/shares` | 201 | Body: `{ email }`; unknown email → **404** |
| GET | `/collections/:collectionId/shares` | 200 | Owner-only |
| DELETE | `/collections/:collectionId/shares/:granteeUserId` | 200 / 404 | Owner-only |

**Errors:** Domain `NotFoundError` → **404**; `ForbiddenError` → **403**; validation → **400** (`BadRequestException`).

## Filters

- **`GET /bookmarks?collectionId=`** — Returns bookmarks in that collection visible to the caller. Caller must have read access to the collection; otherwise **404**.

## On delete

- **Collection delete:** Prisma `onDelete: Cascade` removes `CollectionShare` rows; bookmarks use `onDelete: SetNull` on `collectionId`.
- **Bookmark delete:** Hard delete row.
- **Share revoke:** Deletes `CollectionShare` row only.

## Privacy enforcement

- Lists and reads never expose other users’ private collections/bookmarks.
- Non-owners without a share get **404** (not **403**) for unknown/inaccessible collection/bookmark IDs.
- Collection grantees: read lists/detail/bookmarks; **403** on collection or bookmark mutations.
- Share invite: email must match an existing user (**404** if not) to avoid email enumeration leaks in success responses.

## Agent mistakes

1. **Skipping `@bookmark-manager/api-client` / wrong Orval names**
   - **Wrong:** Early web drafts guessed hook names (`useListCollections`) and sketched hand-written DTO interfaces instead of importing generated models/hooks.
   - **Found:** `pnpm --filter @bookmark-manager/web build` / TypeScript failed on missing exports after Task 9 codegen; Orval actually emits controller-prefixed names (e.g. `useCollectionsControllerList`).
   - **Fixed:** Regenerated via `pnpm codegen:api`, then rewired pages to generated hooks only; agent rules already forbid hand-copied DTOs — enforced in Task 12/13 follow-ups.

2. **Treating share grantees as writers (status + UI)**
   - **Wrong:** First bookmarks privacy suite treated grantee mutate as **404** (and UI enabled owner actions without waiting for `/me`), matching a naive “no access → 404” default instead of “read access but no write → 403”.
   - **Found:** Share e2e and the 404-vs-403 ADR required grantee PATCH/DELETE → **403**; Task 7 follow-up + commit `57bf422` realigned bookmark codes. Web: Shared/Delete flash until `meQuery` resolved (Task 12 follow-up).
   - **Fixed:** `assertCanMutateBookmark` / collection assign via `getWritableOrThrow`; e2e updated; owner UI gated on `/me`. Documented in ADRs and privacy-review checklist.

3. **OpenAPI export assumed a live authenticated server**
   - **Wrong:** First export approach implied hitting a running API (DB + Auth0) to dump Swagger JSON.
   - **Found:** Export failed or was blocked without Postgres/JWKS in agent environments; Nest DI/`import type` also produced OpenAPI `"Function"` schema names when DTOs were type-only imports (Task 14 follow-up).
   - **Fixed:** Offline `export-openapi.ts` Test module (no DB); restore value imports for `@Body`/`@Query` DTOs; `pnpm --filter @bookmark-manager/api export:openapi` then `pnpm codegen:api`.
