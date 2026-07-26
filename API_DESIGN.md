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

1. **Skipping `@bookmark-manager/api-client`** — Defining duplicate DTO types in `apps/web` instead of importing generated models/hooks.
2. **Treating share grantees as writers** — UI enabling edit/delete for shared collections; API returns **403**.
3. **OpenAPI export without offline bootstrap** — Running export against a live server that requires DB/auth instead of the offline `export-openapi.ts` test module (no Postgres needed).
