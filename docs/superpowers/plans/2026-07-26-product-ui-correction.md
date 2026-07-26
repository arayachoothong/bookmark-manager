# Product UI Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship server-side search, many-to-many bookmark↔collection membership, collection detail editing, shared bookmark create/edit form, and top-right admin alerts.

**Architecture:** Migrate Prisma from `Bookmark.collectionId` to a `BookmarkCollection` join table; expose `collectionIds` on bookmark DTOs/responses plus collection membership endpoints; add optional `q` / `collectionId` list filters; regenerate Orval; then update web screens one responsibility per file, reusing Loading/NoData/alerts/`*.helper.ts` conventions.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest e2e, Orval + React Query, React Router, MUI (AlertToast), Vite monorepo (`pnpm`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-product-ui-correction-design.md`
- Builds on prior UX conventions: `<App />`, guest `/403`/`/404`, `helpers/` + `*.helper.ts`, one file one responsibility, List/ListItem/ListItemActions
- IDs are **cuid** strings (not UUIDs) — do not add UUID-format validation; unknown/unreadable collection → privacy **404**
- Optional query params: omit when unused; treat empty `collectionId` / `q` as omitted
- No `unassigned` / `null` sentinel for list filters
- UI label **Description** maps to API field **`notes`**
- Privacy: read bookmark if owner **or** readable on **any** joined collection; mutate owner-only (readable non-owner → 403, else 404)
- Membership add/remove: caller owns bookmark **and** writable collection; DELETE membership does not delete bookmark
- TDD for API behavior; frequent commits; DRY/YAGNI
- After OpenAPI changes always run `pnpm codegen:api` from repo root before web compile

## File Structure

### API — create / modify

| Path | Responsibility |
| --- | --- |
| `apps/api/prisma/schema.prisma` | `BookmarkCollection` join; drop `Bookmark.collectionId` |
| `apps/api/prisma/migrations/<timestamp>_bookmark_collections/` | SQL: create join, backfill, drop column |
| `apps/api/src/shared/openapi/api-models.ts` | `BookmarkResponse.collectionIds: string[]` |
| `apps/api/src/domains/bookmarks/interface/dto/create-bookmark.dto.ts` | `collectionIds?: string[]` (remove `collectionId`) |
| `apps/api/src/domains/bookmarks/interface/dto/update-bookmark.dto.ts` | same |
| `apps/api/src/domains/bookmarks/interface/dto/patch-bookmark.dto.ts` | `collectionIds?: string[]` |
| `apps/api/src/domains/bookmarks/interface/dto/query-bookmarks.dto.ts` | optional `q`, `collectionId` |
| `apps/api/src/domains/collections/interface/dto/query-collections.dto.ts` | **Create** — optional `q` |
| `apps/api/src/domains/collections/interface/dto/add-bookmarks-to-collection.dto.ts` | **Create** — `{ bookmarkIds: string[] }` |
| `apps/api/src/domains/bookmarks/infrastructure/bookmarks.repository.ts` | Join-aware list/find/create/update/setMemberships |
| `apps/api/src/domains/bookmarks/application/bookmarks.service.ts` | Privacy-via-any + `collectionIds` replace |
| `apps/api/src/domains/bookmarks/interface/bookmarks.controller.ts` | Pass `q` query |
| `apps/api/src/domains/collections/infrastructure/collections.repository.ts` | `q` list; join list bookmarks; add/remove membership |
| `apps/api/src/domains/collections/application/collections.service.ts` | Search + membership methods; response mapping |
| `apps/api/src/domains/collections/interface/collections.controller.ts` | `?q=` list; POST/DELETE membership |
| `apps/api/test/bookmarks.privacy.e2e-spec.ts` | Update for `collectionIds`; cleanup join rows |
| `apps/api/test/bookmarks.search-membership.e2e-spec.ts` | **Create** — search + M2M + membership |
| `apps/api/test/collections.privacy.e2e-spec.ts` | Cleanup join rows |

### Web / UI — create / modify

| Path | Responsibility |
| --- | --- |
| `packages/ui/src/AlertToast.tsx` | Top-right admin-style toast |
| `apps/web/src/lib/hooks/useDebouncedValue.ts` | **Create** — debounced search value |
| `apps/web/src/domains/collections/components/CollectionsSearchField.tsx` | **Create** — search input only |
| `apps/web/src/domains/collections/components/CollectionsScreen.tsx` | Wire `?q=` |
| `apps/web/src/domains/collections/components/CollectionNameForm.tsx` | **Create** — always-visible name + Save/Delete |
| `apps/web/src/domains/collections/components/AddExistingBookmarksModal.tsx` | **Create** — picker + POST membership |
| `apps/web/src/domains/collections/components/CollectionDetailScreen.tsx` | Compose name form + bookmarks + add/create/remove |
| `apps/web/src/domains/bookmarks/helpers/bookmark-query.helper.ts` | Invalidate for `collectionIds: string[]` |
| `apps/web/src/domains/bookmarks/components/BookmarksSearchField.tsx` | **Create** — title search |
| `apps/web/src/domains/bookmarks/components/BookmarksScreen.tsx` | Wire `q` + existing `CollectionFilter` |
| `apps/web/src/domains/bookmarks/components/BookmarkForm.tsx` | **Create** — shared Title/URL/Description/Collections |
| `apps/web/src/domains/bookmarks/components/BookmarkCollectionsField.tsx` | **Create** — multi-select collections |
| `apps/web/src/domains/bookmarks/components/CreateBookmarkScreen.tsx` | Use `BookmarkForm` + `collectionIds` |
| `apps/web/src/domains/bookmarks/components/EditBookmarkScreen.tsx` | Use `BookmarkForm` + delete |
| `apps/web/src/domains/bookmarks/components/AssignBookmarkFields.tsx` | Multi-select → `collectionIds` (or replace with `BookmarkCollectionsField`) |
| `apps/web/src/domains/bookmarks/components/AssignBookmarkModal.tsx` | Patch `collectionIds` |
| `apps/web/src/domains/bookmarks/hooks/useBookmarkAssignment.ts` | Invalidate `collectionIds` |
| `apps/web/src/domains/bookmarks/components/AssignBookmarkScreen.tsx` | Same `collectionIds` update |
| `apps/web/src/domains/bookmarks/components/BookmarkListItem.tsx` | Show chips from `collectionIds` |

### Generated (do not hand-edit)

- `openapi/openapi.json`
- `packages/api-client/src/generated/**`

---

### Task 1: Prisma many-to-many migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_bookmark_collections/migration.sql` (via `prisma migrate`)
- Test: migration applies; client generates

**Interfaces:**
- Produces: `BookmarkCollection` model; `Bookmark.collections` / `Collection.bookmarkLinks` relations; no `Bookmark.collectionId`

- [ ] **Step 1: Update Prisma schema**

Replace Bookmark/Collection relations with:

```prisma
model Collection {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner         User                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  bookmarkLinks BookmarkCollection[]
  shares        CollectionShare[]
}

model Bookmark {
  id        String   @id @default(cuid())
  url       String
  title     String
  notes     String?
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner       User                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  collections BookmarkCollection[]
}

model BookmarkCollection {
  bookmarkId   String
  collectionId String
  createdAt    DateTime @default(now())

  bookmark   Bookmark   @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, collectionId])
}
```

Keep `User` / `CollectionShare` unchanged (except Collection relation name above).

- [ ] **Step 2: Create and apply migration with backfill**

From `apps/api`:

```bash
pnpm prisma migrate dev --name bookmark_collections --create-only
```

Edit the generated SQL so it:

1. Creates `BookmarkCollection`
2. Backfills: `INSERT INTO "BookmarkCollection" ("bookmarkId", "collectionId", "createdAt") SELECT id, "collectionId", NOW() FROM "Bookmark" WHERE "collectionId" IS NOT NULL;`
3. Drops FK/column `Bookmark.collectionId`

Then:

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

Expected: migrate succeeds; client types have no `collectionId` on `Bookmark`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): migrate bookmarks to many-to-many collections"
```

---

### Task 2: OpenAPI models and bookmark/collection DTOs

**Files:**
- Modify: `apps/api/src/shared/openapi/api-models.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/create-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/update-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/patch-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/query-bookmarks.dto.ts`
- Create: `apps/api/src/domains/collections/interface/dto/query-collections.dto.ts`
- Create: `apps/api/src/domains/collections/interface/dto/add-bookmarks-to-collection.dto.ts`

**Interfaces:**
- Produces: `BookmarkResponse.collectionIds: string[]`; DTOs with `collectionIds?: string[]`; `QueryBookmarksDto.{q?, collectionId?}`; `QueryCollectionsDto.{q?}`; `AddBookmarksToCollectionDto.{bookmarkIds: string[]}`

- [ ] **Step 1: Update `BookmarkResponse`**

In `api-models.ts`, replace `collectionId` with:

```typescript
  @ApiProperty({ type: [String] })
  collectionIds!: string[];
```

- [ ] **Step 2: Update bookmark body DTOs**

`CreateBookmarkDto` / `UpdateBookmarkDto`:

```typescript
  @ApiPropertyOptional({ type: [String] })
  collectionIds?: string[];
```

Remove `collectionId`. Keep `url`, `title`, `notes`.

`PatchBookmarkDto`:

```typescript
  @ApiPropertyOptional({ type: [String] })
  collectionIds?: string[];
```

Remove nullable `collectionId`. Clear memberships with `collectionIds: []`.

- [ ] **Step 3: Query DTOs**

`query-bookmarks.dto.ts`:

```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryBookmarksDto {
  @ApiPropertyOptional({
    description: "Case-insensitive contains match on title",
  })
  q?: string;

  @ApiPropertyOptional({
    description: "Filter to bookmarks in a collection the caller can read",
  })
  collectionId?: string;
}
```

Create `query-collections.dto.ts`:

```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryCollectionsDto {
  @ApiPropertyOptional({
    description: "Case-insensitive contains match on name",
  })
  q?: string;
}
```

Create `add-bookmarks-to-collection.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class AddBookmarksToCollectionDto {
  @ApiProperty({ type: [String] })
  bookmarkIds!: string[];
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/shared/openapi/api-models.ts \
  apps/api/src/domains/bookmarks/interface/dto \
  apps/api/src/domains/collections/interface/dto
git commit -m "feat(api): DTOs for collectionIds, search q, membership"
```

---

### Task 3: Bookmarks repository (join-aware)

**Files:**
- Modify: `apps/api/src/domains/bookmarks/infrastructure/bookmarks.repository.ts`

**Interfaces:**
- Produces:
  - `type BookmarkWithCollections = Bookmark & { collections: { collectionId: string }[] }`
  - `findById(id): Promise<BookmarkWithCollections | null>`
  - `listReadableForUser(userId, opts?: { collectionId?: string; q?: string }): Promise<BookmarkWithCollections[]>`
  - `create` / `update` returning bookmark with collections
  - `setCollectionIds(bookmarkId, collectionIds: string[]): Promise<BookmarkWithCollections>`
  - `delete(id)`

- [ ] **Step 1: Rewrite repository**

```typescript
import { Injectable } from "@nestjs/common";
import type { Bookmark, Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const collectionsInclude = {
  collections: { select: { collectionId: true } },
} as const;

export type BookmarkWithCollections = Bookmark & {
  collections: { collectionId: string }[];
};

@Injectable()
export class BookmarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<BookmarkWithCollections | null> {
    return this.prisma.bookmark.findUnique({
      where: { id },
      include: collectionsInclude,
    });
  }

  listReadableForUser(
    userId: string,
    opts?: { collectionId?: string; q?: string },
  ): Promise<BookmarkWithCollections[]> {
    const titleFilter =
      opts?.q && opts.q.trim().length > 0
        ? { title: { contains: opts.q.trim(), mode: "insensitive" as const } }
        : {};

    if (opts?.collectionId) {
      return this.prisma.bookmark.findMany({
        where: {
          ...titleFilter,
          collections: { some: { collectionId: opts.collectionId } },
        },
        include: collectionsInclude,
        orderBy: { updatedAt: "desc" },
      });
    }

    return this.prisma.bookmark.findMany({
      where: {
        ...titleFilter,
        OR: [
          { ownerId: userId },
          {
            collections: {
              some: {
                collection: {
                  shares: { some: { granteeUserId: userId } },
                },
              },
            },
          },
        ],
      },
      include: collectionsInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  create(
    data: Prisma.BookmarkCreateInput,
  ): Promise<BookmarkWithCollections> {
    return this.prisma.bookmark.create({
      data,
      include: collectionsInclude,
    });
  }

  update(
    id: string,
    data: Prisma.BookmarkUpdateInput,
  ): Promise<BookmarkWithCollections> {
    return this.prisma.bookmark.update({
      where: { id },
      data,
      include: collectionsInclude,
    });
  }

  async setCollectionIds(
    bookmarkId: string,
    collectionIds: string[],
  ): Promise<BookmarkWithCollections> {
    const uniqueIds = [...new Set(collectionIds)];
    return this.prisma.$transaction(async (tx) => {
      await tx.bookmarkCollection.deleteMany({ where: { bookmarkId } });
      if (uniqueIds.length > 0) {
        await tx.bookmarkCollection.createMany({
          data: uniqueIds.map((collectionId) => ({
            bookmarkId,
            collectionId,
          })),
        });
      }
      return tx.bookmark.findUniqueOrThrow({
        where: { id: bookmarkId },
        include: collectionsInclude,
      });
    });
  }

  delete(id: string): Promise<Bookmark> {
    return this.prisma.bookmark.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/domains/bookmarks/infrastructure/bookmarks.repository.ts
git commit -m "feat(api): join-aware bookmarks repository"
```

---

### Task 4: Bookmarks service + controller (privacy + collectionIds + q)

**Files:**
- Modify: `apps/api/src/domains/bookmarks/application/bookmarks.service.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/bookmarks.controller.ts`

**Interfaces:**
- Consumes: `BookmarksRepository` from Task 3; `CollectionAccessService`
- Produces: responses with `collectionIds: string[]`; list honors optional `q` + `collectionId`

- [ ] **Step 1: Rewrite service**

Replace `toBookmarkResponse` / privacy / create-update to use join rows. Core patterns:

```typescript
function toBookmarkResponse(bookmark: BookmarkWithCollections) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    notes: bookmark.notes,
    collectionIds: bookmark.collections.map((row) => row.collectionId),
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

function normalizeOptionalQuery(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
```

`listForUser`: normalize `q` / `collectionId`; if `collectionId` set, `getReadableOrThrow` then `listReadableForUser(userId, { collectionId, q })`.

`create`: for each `collectionIds` entry `getWritableOrThrow`; create with nested `collections.create`.

`replace` / `patch`: when `collectionIds` present, validate writable then `setCollectionIds` (replace set; `[]` clears). Omit on PATCH → leave memberships unchanged.

`assertCanReadBookmark`: owner OR any collection passes `getReadableOrThrow`.

`assertCanMutateBookmark`: owner only; if readable non-owner → `ForbiddenError`; else `NotFoundError`.

Also add membership helpers on this service to avoid Nest circular modules (used by Task 5 controller):

```typescript
async addToCollection(user: User, collectionId: string, bookmarkIds: string[])
async removeFromCollection(user: User, collectionId: string, bookmarkId: string)
```

Rules: collection writable; each bookmark owned by caller (else 403 if readable / 404 otherwise); `createMany({ skipDuplicates: true })` / `deleteMany`.

- [ ] **Step 2: Controller — document `q`**

```typescript
  @Get()
  @ApiOperation({ summary: "List bookmarks readable by the caller" })
  @ApiQuery({ name: "collectionId", required: false })
  @ApiQuery({ name: "q", required: false })
  @ApiOkResponse({ type: BookmarkResponse, isArray: true })
  list(@CurrentUser() user: User, @Query() query: QueryBookmarksDto) {
    return this.bookmarksService.listForUser(user, query);
  }
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/domains/bookmarks
git commit -m "feat(api): bookmarks collectionIds, search, multi-collection privacy"
```

---

### Task 5: Collections search + membership HTTP routes

**Files:**
- Modify: `apps/api/src/domains/collections/infrastructure/collections.repository.ts`
- Modify: `apps/api/src/domains/collections/application/collections.service.ts`
- Modify: `apps/api/src/domains/collections/interface/collections.controller.ts`
- Modify: `apps/api/src/domains/collections/collections.module.ts` (import BookmarksModule / inject BookmarksService)

**Interfaces:**
- Consumes: `QueryCollectionsDto`, `AddBookmarksToCollectionDto`; `BookmarksService.addToCollection` / `removeFromCollection`
- Produces: `listForUser(user, { q? })`; HTTP POST/DELETE membership; `listBookmarks` returns `collectionIds`

- [ ] **Step 1: Repository**

Update `listReadableForUser(userId, q?: string)` with optional insensitive `name contains`.

Replace `listBookmarksInCollection`:

```typescript
  listBookmarksInCollection(collectionId: string) {
    return this.prisma.bookmark.findMany({
      where: { collections: { some: { collectionId } } },
      include: { collections: { select: { collectionId: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }
```

- [ ] **Step 2: Service**

- `listForUser(user, query)` passes trimmed `q`
- `toBookmarkResponse` uses `collectionIds` from join (same shape as bookmarks service)
- Membership mutations **delegate** to `BookmarksService` methods from Task 4

- [ ] **Step 3: Controller**

```typescript
  @Get()
  @ApiQuery({ name: "q", required: false })
  list(@CurrentUser() user: User, @Query() query: QueryCollectionsDto) {
    return this.collectionsService.listForUser(user, query);
  }

  @Post(":id/bookmarks")
  async addBookmarks(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: AddBookmarksToCollectionDto,
  ) {
    await this.bookmarksService.addToCollection(user, id, dto.bookmarkIds);
  }

  @Delete(":id/bookmarks/:bookmarkId")
  async removeBookmark(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("bookmarkId") bookmarkId: string,
  ) {
    await this.bookmarksService.removeFromCollection(user, id, bookmarkId);
  }
```

Keep `GET :id/bookmarks`. Ensure `Get()` precedes `Get(':id')`.

Export `BookmarksService` from `BookmarksModule`; import `BookmarksModule` into `CollectionsModule`. If circular, move membership methods to a small `BookmarkMembershipService` in bookmarks domain and import that only.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/domains/collections apps/api/src/domains/bookmarks
git commit -m "feat(api): collection search and bookmark membership endpoints"
```

---

### Task 6: E2E — update privacy + add search/membership

**Files:**
- Modify: `apps/api/test/bookmarks.privacy.e2e-spec.ts`
- Modify: `apps/api/test/collections.privacy.e2e-spec.ts`
- Modify: `apps/api/test/shares.e2e-spec.ts` if it touches bookmarks/`collectionId`
- Create: `apps/api/test/bookmarks.search-membership.e2e-spec.ts`

**Interfaces:**
- Consumes: API from Tasks 1–5

- [ ] **Step 1: Update cleanup + payloads**

In every e2e `afterEach`:

```typescript
await prisma.bookmarkCollection.deleteMany();
await prisma.collectionShare.deleteMany();
await prisma.bookmark.deleteMany();
await prisma.collection.deleteMany();
```

Replace create bodies `collectionId: x` → `collectionIds: [x]`.
Replace assertions on `collectionId` → `collectionIds`.

In `collections.privacy.e2e-spec.ts`, rewrite the test currently named like “DELETE collection nulls bookmark.collectionId…” so that after collection delete: the bookmark row still exists, and no `BookmarkCollection` rows remain for that collection (join cascade). Create bookmarks via `collectionIds: [id]` (or membership POST).

- [ ] **Step 2: New e2e file cases**

Same auth harness as privacy tests:

1. `GET /collections?q=` filters by name  
2. `GET /bookmarks?q=` filters by title  
3. Combined `q` + `collectionId`  
4. Create with multiple `collectionIds`  
5. PATCH `collectionIds` replaces set  
6. Grantee can read via any shared collection  
7. POST membership idempotent for owner  
8. DELETE membership unassigns only (bookmark still GET 200)  
9. Viewer cannot POST membership (403)

- [ ] **Step 3: Run e2e**

```bash
cd apps/api && pnpm test:e2e
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/test
git commit -m "test(api): e2e for search, collectionIds, membership"
```

---

### Task 7: Regenerate Orval client

**Files:**
- Regenerate: `openapi/openapi.json`, `packages/api-client/src/generated/**`

- [ ] **Step 1: Codegen**

```bash
pnpm codegen:api
```

Expected: types use `collectionIds`; list params include `q`; membership mutation hooks exist (use generated names).

- [ ] **Step 2: Commit**

```bash
git add openapi/openapi.json packages/api-client
git commit -m "chore(api-client): regen for collectionIds and search"
```

---

### Task 8: AlertToast — top-right admin style

**Files:**
- Modify: `packages/ui/src/AlertToast.tsx`

- [ ] **Step 1: Reposition and restyle**

```tsx
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export type AlertSeverity = "success" | "error";

export type AlertToastProps = {
  open: boolean;
  severity: AlertSeverity;
  message: string;
  onClose: () => void;
};

export function AlertToast({ open, severity, message, onClose }: AlertToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <MuiAlert
        severity={severity}
        variant="outlined"
        onClose={onClose}
        sx={{
          bgcolor: "background.paper",
          borderLeftWidth: 4,
          boxShadow: 2,
          alignItems: "center",
        }}
      >
        {message}
      </MuiAlert>
    </Snackbar>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/AlertToast.tsx
git commit -m "fix(ui): move alerts top-right with admin chrome"
```

---

### Task 9: `useDebouncedValue` hook

**Files:**
- Create: `apps/web/src/lib/hooks/useDebouncedValue.ts`

**Interfaces:**
- Produces: `useDebouncedValue<T>(value: T, delayMs?: number): T` (default 300)

- [ ] **Step 1: Implement**

```typescript
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/hooks/useDebouncedValue.ts
git commit -m "feat(web): add useDebouncedValue for search inputs"
```

---

### Task 10: Collections list search

**Files:**
- Create: `apps/web/src/domains/collections/components/CollectionsSearchField.tsx`
- Modify: `apps/web/src/domains/collections/components/CollectionsScreen.tsx`

**Interfaces:**
- Consumes: `useDebouncedValue`; `useCollectionsControllerList` with optional `{ q }` (omit when empty)

- [ ] **Step 1: Search field**

Single-responsibility `TextField` labeled “Search collections”; controlled `value` / `onChange`.

- [ ] **Step 2: Wire screen**

```tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebouncedValue(search.trim());
const listParams = debouncedSearch ? { q: debouncedSearch } : undefined;

const collectionsQuery = useCollectionsControllerList(listParams, {
  query: {
    enabled: isApiAuthReady,
    queryKey: getCollectionsControllerListQueryKey(listParams),
  },
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @bookmark-manager/web exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/domains/collections
git commit -m "feat(web): collections list server search"
```

---

### Task 11: Collection detail — name form, add existing, unassign

**Files:**
- Create: `apps/web/src/domains/collections/components/CollectionNameForm.tsx`
- Create: `apps/web/src/domains/collections/components/AddExistingBookmarksModal.tsx`
- Modify: `apps/web/src/domains/collections/components/CollectionDetailScreen.tsx`
- Modify: `apps/web/src/domains/bookmarks/helpers/bookmark-query.helper.ts`
- Modify: bookmark list item actions as needed so collection detail can **Remove** (unassign) without deleting

**Interfaces:**
- Consumes: patch/remove collection hooks; membership mutation; `useBookmarksControllerList({ q })` for picker
- Produces: owner rename/delete; add existing; create-new link; membership remove

- [ ] **Step 1: Cache helper supports `collectionIds`**

```typescript
type InvalidateBookmarkCachesOptions = {
  bookmarkId?: string;
  collectionId?: string | null;
  collectionIds?: Array<string | null | undefined>;
};
```

Invalidate each distinct collection id’s list-bookmarks query + existing predicate fallback.

- [ ] **Step 2: `CollectionNameForm`**

Always-visible name + Save (PATCH) + Delete (`onDelete` opens confirm). Not shown for viewers.

- [ ] **Step 3: `AddExistingBookmarksModal`**

Debounced search of caller bookmarks; exclude those already in `collectionIds`; multi-select; POST `{ bookmarkIds }`; invalidate + alert + close.

- [ ] **Step 4: Rebuild `CollectionDetailScreen`**

Owner: name form; Bookmarks section with Add existing + Create new (`/bookmarks/new?collectionId=`); row → `/bookmarks/:id`; Remove → DELETE membership.  
Viewer: read-only name + list.  
Errors → `routeForQueryError` → `/404`.  
Collection delete copy: bookmarks are kept; only memberships go away.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domains/collections apps/web/src/domains/bookmarks
git commit -m "feat(web): collection detail rename, add existing, unassign"
```

---

### Task 12: Bookmarks list search

**Files:**
- Create: `apps/web/src/domains/bookmarks/components/BookmarksSearchField.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/BookmarksScreen.tsx`
- Keep: `CollectionFilter.tsx` (already omits empty `collectionId`)

- [ ] **Step 1: Wire params**

```tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebouncedValue(search.trim());
const filterCollectionId = useBookmarkCollectionFilterParam();

const listParams = {
  ...(debouncedSearch ? { q: debouncedSearch } : {}),
  ...(filterCollectionId ? { collectionId: filterCollectionId } : {}),
};
const listQueryParams =
  Object.keys(listParams).length > 0 ? listParams : undefined;
```

Fix delete invalidation to use `deleted?.collectionIds`. Update `AssignBookmarkModal` prop from `currentCollectionId` to `currentCollectionIds`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/domains/bookmarks
git commit -m "feat(web): bookmarks list search with collection filter"
```

---

### Task 13: Shared `BookmarkForm` + create/edit/assign

**Files:**
- Create: `apps/web/src/domains/bookmarks/components/BookmarkCollectionsField.tsx`
- Create: `apps/web/src/domains/bookmarks/components/BookmarkForm.tsx`
- Modify: `CreateBookmarkScreen.tsx`, `EditBookmarkScreen.tsx`
- Modify: `AssignBookmarkFields.tsx` / `AssignBookmarkModal.tsx` / `AssignBookmarkScreen.tsx` / `useBookmarkAssignment.ts`
- Modify: `BookmarkListItem.tsx` for `collectionIds` chips

**Interfaces:**
- Produces: `BookmarkFormValues = { url: string; title: string; notes: string; collectionIds: string[] }`
- Form fields order: Title, URL, Description (`notes`), Collections (multi-select)

- [ ] **Step 1: `BookmarkCollectionsField`** — MUI multi `Select` over owned collections

- [ ] **Step 2: `BookmarkForm`** — controlled fields only; parent owns mutations / alerts

- [ ] **Step 3: Create** — prefill from `?collectionId=` into `collectionIds`; POST with `collectionIds` only when non-empty; invalidate those ids

- [ ] **Step 4: Edit** — hydrate `collectionIds`; PATCH including array; Description label; Delete confirm; viewer → `/403`

- [ ] **Step 5: Assign flows** — PATCH `{ collectionIds }` replace set; `[]` clears; invalidate selected ids

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @bookmark-manager/web exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/domains/bookmarks
git commit -m "feat(web): shared bookmark form with multi collectionIds"
```

---

### Task 14: Full-flow verification

- [ ] **Step 1: API e2e** — `cd apps/api && pnpm test:e2e` → PASS

- [ ] **Step 2: Builds**

```bash
pnpm --filter @bookmark-manager/api build
pnpm --filter @bookmark-manager/web build
```

- [ ] **Step 3: Manual smoke**

1. Collections search  
2. Collection detail rename / add existing / create new / remove  
3. Bookmarks search + collection filter  
4. Create/edit with Description + multiple collections  
5. Top-right toast  
6. Unshared collection → `/404`

- [ ] **Step 4: Commit any intentional leftover fixes only**

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| Join table + backfill + drop `collectionId` | 1 |
| `collectionIds` on responses/DTOs | 2, 4 |
| Privacy via any collection | 4, 6 |
| `GET /collections?q=` | 5, 6, 10 |
| `GET /bookmarks?q=` + optional `collectionId` | 4, 6, 12 |
| No unassigned sentinel; omit unused params | 4, 10, 12 |
| Body `collectionIds` replace semantics | 4, 6, 13 |
| Membership POST/DELETE | 5, 6, 11 |
| Orval regen | 7 |
| Alerts top-right | 8 |
| Collection detail name/Save/Delete | 11 |
| Add existing + Create new | 11 |
| Shared form Description→notes, multi collections | 13 |
| Bookmarks list search + filter | 12 |
| `/403`/`/404` unchanged | 11, 13 |

## Notes for implementers

- Prefer membership methods on `BookmarksService` (Task 4) if Nest module imports would cycle.
- Empty query strings must be treated as omitted on both API and web.
- Do not hand-edit Orval output.
- Collection delete does **not** delete bookmarks — only join rows cascade.
- Spec mentioned “UUID” for `collectionId`; this codebase uses **cuid** — validate non-empty string only.
