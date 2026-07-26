# Notes → Description Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hard-rename the bookmark optional text field from `notes` to `description` across Prisma, OpenAPI/DTOs, services, seed, Orval client, and web form state so BE and FE share one name.

**Architecture:** One Prisma `RENAME COLUMN` migration; update OpenAPI models and Nest DTOs; map `description` in bookmarks/collections services; regenerate Orval; update `BookmarkFormValues` and create/edit panels. No dual-read, no `@map("notes")`, no search behavior change.

**Tech Stack:** Prisma 6 + PostgreSQL, NestJS OpenAPI, Orval (`pnpm codegen:api`), React web (`apps/web`), Jest unit tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-notes-to-description-design.md`
- Hard rename only — property is `description` from DB through API to FE
- Semantics unchanged: optional; omit/empty on create; `null` clears on update/patch
- UI label stays **Description** (already correct on `BookmarkForm`)
- `GET /bookmarks?q=` remains title-only; do not search `description`
- Living docs only if they mention `notes` (API_DESIGN/README currently do not) — do not rewrite historical superpowers plans/specs
- YAGNI: no dual-compat for old `notes` payloads; no collections `description` field
- TDD: update unit fixtures/expectations first where practical; then implementation
- One file, one responsibility — do not merge unrelated refactors into this rename

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/api/prisma/schema.prisma` | `Bookmark.description String?` |
| `apps/api/prisma/migrations/20260726191500_rename_bookmark_notes_to_description/migration.sql` | **Create** — `RENAME COLUMN` |
| `apps/api/src/shared/openapi/api-models.ts` | `BookmarkResponse.description` |
| `apps/api/src/domains/bookmarks/interface/dto/create-bookmark.dto.ts` | Optional `description?: string` |
| `apps/api/src/domains/bookmarks/interface/dto/update-bookmark.dto.ts` | Optional `description?: string \| null` |
| `apps/api/src/domains/bookmarks/interface/dto/patch-bookmark.dto.ts` | Optional `description?: string \| null` |
| `apps/api/src/domains/bookmarks/application/bookmarks.service.ts` | Map/create/update/patch `description` |
| `apps/api/src/domains/bookmarks/application/bookmarks.service.spec.ts` | Fixtures + expectations use `description` |
| `apps/api/src/domains/collections/application/collections.service.ts` | Bookmark mapper uses `description` |
| `apps/api/src/domains/collections/application/collections.service.spec.ts` | Fixture uses `description` |
| `apps/api/prisma/seed-data.ts` | Catalog field `description` |
| `apps/api/prisma/seed.ts` | `ensureBookmark` uses `description` |
| `packages/api-client/src/generated/**` | Regenerated Orval models |
| `apps/web/src/domains/bookmarks/components/BookmarkForm.tsx` | `BookmarkFormValues.description` |
| `apps/web/src/domains/bookmarks/components/CreateBookmarkPanel.tsx` | Submit `description` |
| `apps/web/src/domains/bookmarks/components/EditBookmarkPanel.tsx` | Load/submit `description` |

---

### Task 1: Prisma schema + rename migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260726191500_rename_bookmark_notes_to_description/migration.sql`

**Interfaces:**
- Produces: Prisma model field `Bookmark.description: String?`; DB column `"description"` after migrate

- [ ] **Step 1: Rename the Prisma field**

In `apps/api/prisma/schema.prisma`, change the `Bookmark` model field:

```prisma
model Bookmark {
  id          String   @id @default(cuid())
  url         String
  title       String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner       User                 @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  collections BookmarkCollection[]
}
```

- [ ] **Step 2: Add the SQL migration**

Create `apps/api/prisma/migrations/20260726191500_rename_bookmark_notes_to_description/migration.sql`:

```sql
-- RenameColumn
ALTER TABLE "Bookmark" RENAME COLUMN "notes" TO "description";
```

- [ ] **Step 3: Generate Prisma client**

Run from repo root:

```bash
pnpm --filter @bookmark-manager/api prisma:generate
```

Expected: Prisma client regenerates with `description` on `Bookmark` (exit 0).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260726191500_rename_bookmark_notes_to_description/migration.sql
git commit -m "$(cat <<'EOF'
chore(api): rename Bookmark.notes column to description

EOF
)"
```

---

### Task 2: OpenAPI, DTOs, services, unit tests

**Files:**
- Modify: `apps/api/src/shared/openapi/api-models.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/create-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/update-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/interface/dto/patch-bookmark.dto.ts`
- Modify: `apps/api/src/domains/bookmarks/application/bookmarks.service.ts`
- Modify: `apps/api/src/domains/bookmarks/application/bookmarks.service.spec.ts`
- Modify: `apps/api/src/domains/collections/application/collections.service.ts`
- Modify: `apps/api/src/domains/collections/application/collections.service.spec.ts`

**Interfaces:**
- Consumes: Prisma `Bookmark.description` from Task 1
- Produces:
  - `BookmarkResponse.description: string | null`
  - `CreateBookmarkDto.description?: string`
  - `UpdateBookmarkDto.description?: string | null`
  - `PatchBookmarkDto.description?: string | null`
  - Service mappers return `description` (not `notes`)

- [ ] **Step 1: Update unit fixtures to `description` (failing until services match)**

In `bookmarks.service.spec.ts`, change the fixture and replace expectation:

```typescript
  const bookmark = (
    overrides: Partial<BookmarkWithCollections> = {},
  ): BookmarkWithCollections => ({
    id: "bookmark-1",
    url: "https://example.com",
    title: "Example",
    description: null,
    ownerId: user.id,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    collections: [{ collectionId: "collection-1" }],
    ...overrides,
  });
```

And in the replace test expectation:

```typescript
    expect(updateWithCollectionIds).toHaveBeenCalledWith(
      "bookmark-1",
      {
        url: "https://example.com",
        title: "Example",
        description: null,
      },
      ["collection-2"],
    );
```

In `collections.service.spec.ts`, change the list-bookmarks fixture object:

```typescript
      {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example",
        description: null,
        ownerId: user.id,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        collections: [
          { collectionId: "collection-1" },
          { collectionId: "collection-2" },
        ],
      },
```

- [ ] **Step 2: Run unit tests — expect failures / type errors**

```bash
pnpm --filter @bookmark-manager/api test -- bookmarks.service.spec collections.service.spec
```

Expected: FAIL or TS errors because services/DTOs still use `notes` while Prisma/fixtures use `description`.

- [ ] **Step 3: Rename OpenAPI model + DTOs**

`apps/api/src/shared/openapi/api-models.ts` — in `BookmarkResponse`:

```typescript
  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;
```

`create-bookmark.dto.ts`:

```typescript
  @ApiPropertyOptional()
  description?: string;
```

`update-bookmark.dto.ts`:

```typescript
  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;
```

`patch-bookmark.dto.ts`:

```typescript
  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;
```

- [ ] **Step 4: Update bookmarks service mapper and writes**

In `bookmarks.service.ts`:

```typescript
function toBookmarkResponse(bookmark: BookmarkWithCollections) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    collectionIds: bookmark.collections.map((row) => row.collectionId),
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}
```

Create:

```typescript
    const bookmark = await this.bookmarksRepository.create({
      url,
      title,
      description: dto.description ?? null,
      owner: { connect: { id: user.id } },
      // ... collections unchanged
    });
```

Replace:

```typescript
    const data: Parameters<BookmarksRepository["update"]>[1] = {
      url,
      title,
      description: dto.description ?? null,
    };
```

Patch:

```typescript
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
```

- [ ] **Step 5: Update collections service bookmark mapper**

In `collections.service.ts`:

```typescript
function toBookmarkResponse(bookmark: CollectionBookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    collectionIds: bookmark.collections.map((row) => row.collectionId),
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}
```

- [ ] **Step 6: Run unit tests — expect pass**

```bash
pnpm --filter @bookmark-manager/api test -- bookmarks.service.spec collections.service.spec
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add \
  apps/api/src/shared/openapi/api-models.ts \
  apps/api/src/domains/bookmarks/interface/dto/create-bookmark.dto.ts \
  apps/api/src/domains/bookmarks/interface/dto/update-bookmark.dto.ts \
  apps/api/src/domains/bookmarks/interface/dto/patch-bookmark.dto.ts \
  apps/api/src/domains/bookmarks/application/bookmarks.service.ts \
  apps/api/src/domains/bookmarks/application/bookmarks.service.spec.ts \
  apps/api/src/domains/collections/application/collections.service.ts \
  apps/api/src/domains/collections/application/collections.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(api): expose bookmark description instead of notes

EOF
)"
```

---

### Task 3: Seed catalog + writers

**Files:**
- Modify: `apps/api/prisma/seed-data.ts`
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: Prisma `description` from Task 1
- Produces: `DemoBookmarkSeed.description?: string`; `ensureBookmark` input/writes use `description`

- [ ] **Step 1: Rename seed catalog field**

In `seed-data.ts`:

```typescript
export type DemoBookmarkSeed = {
  title: string;
  url: string;
  description?: string;
  collections: readonly DemoCollectionName[];
};
```

Replace every `notes:` key in `DEMO_BOOKMARKS` with `description:` (same string values). Example:

```typescript
  {
    title: "Design Systems Handbook",
    url: "https://www.designsystems.com/handbook",
    description: "Practical guide to design systems.",
    collections: ["Design reading", "Engineering"],
  },
```

Do the same for Refactoring UI and Uncategorized idea entries.

- [ ] **Step 2: Update `ensureBookmark` in `seed.ts`**

```typescript
async function ensureBookmark(
  ownerId: string,
  input: {
    title: string;
    url: string;
    description?: string;
    collectionIds: string[];
  },
) {
  const existing = await prisma.bookmark.findFirst({
    where: { ownerId, title: input.title, url: input.url },
    include: { collections: true },
  });

  if (!existing) {
    return prisma.bookmark.create({
      data: {
        title: input.title,
        url: input.url,
        description: input.description ?? null,
        owner: { connect: { id: ownerId } },
        ...(input.collectionIds.length > 0
          ? {
              collections: {
                create: input.collectionIds.map((collectionId) => ({
                  collection: { connect: { id: collectionId } },
                })),
              },
            }
          : {}),
      },
    });
  }

  // ... membership createMany unchanged ...

  if (
    input.description !== undefined &&
    existing.description !== input.description
  ) {
    await prisma.bookmark.update({
      where: { id: existing.id },
      data: { description: input.description },
    });
  }

  return existing;
}
```

And the call site:

```typescript
    await ensureBookmark(candidate.id, {
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      collectionIds,
    });
```

- [ ] **Step 3: Sanity check — no `notes` left in seed files**

```bash
rg '\bnotes\b' apps/api/prisma/seed.ts apps/api/prisma/seed-data.ts
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed-data.ts apps/api/prisma/seed.ts
git commit -m "$(cat <<'EOF'
chore(api): use description in demo seed bookmarks

EOF
)"
```

---

### Task 4: Regenerate Orval api-client

**Files:**
- Modify: `packages/api-client/src/generated/models/bookmarkResponse.ts` (and related create/update/patch DTOs via Orval)
- Possibly: exported OpenAPI JSON under `apps/api` if `export:openapi` writes a file (follow existing `codegen:api` pipeline)

**Interfaces:**
- Consumes: OpenAPI `description` from Task 2
- Produces: Generated TS types with `description` on bookmark models

- [ ] **Step 1: Run codegen**

```bash
pnpm codegen:api
```

Expected: exit 0; generated models use `description` instead of `notes`.

- [ ] **Step 2: Verify generated models**

```bash
rg '\bnotes\b' packages/api-client/src/generated/models
rg '\bdescription\b' packages/api-client/src/generated/models/bookmarkResponse.ts packages/api-client/src/generated/models/createBookmarkDto.ts packages/api-client/src/generated/models/updateBookmarkDto.ts packages/api-client/src/generated/models/patchBookmarkDto.ts
```

Expected: no `notes` in generated models; `description` present on those four files.

- [ ] **Step 3: Commit**

```bash
git add packages/api-client apps/api
git commit -m "$(cat <<'EOF'
chore(api-client): regenerate client for bookmark description

EOF
)"
```

(Only stage generated/OpenAPI artifacts that `codegen:api` actually changed — do not stage unrelated dirty files like `.env.example`.)

---

### Task 5: Web form + create/edit panels

**Files:**
- Modify: `apps/web/src/domains/bookmarks/components/BookmarkForm.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/CreateBookmarkPanel.tsx`
- Modify: `apps/web/src/domains/bookmarks/components/EditBookmarkPanel.tsx`

**Interfaces:**
- Consumes: Orval `description` from Task 4
- Produces: `BookmarkFormValues = { url; title; description; collectionIds }`

- [ ] **Step 1: Update `BookmarkForm`**

```typescript
export type BookmarkFormValues = {
  url: string;
  title: string;
  description: string;
  collectionIds: string[];
};
```

Description field:

```tsx
      <TextField
        label="Description"
        value={values.description}
        onChange={(event) =>
          onChange({ ...values, description: event.target.value })
        }
        disabled={disabled}
        multiline
        minRows={2}
      />
```

- [ ] **Step 2: Update `CreateBookmarkPanel`**

Initial state:

```typescript
  const [values, setValues] = useState<BookmarkFormValues>(() => ({
    url: "",
    title: "",
    description: "",
    collectionIds: ownedCollectionPrefill(
      ownedCollections,
      queryCollectionId,
    ),
  }));
```

Submit:

```typescript
    const trimmedDescription = values.description.trim();
    createMutation.mutate({
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        ...(values.collectionIds.length > 0
          ? { collectionIds: values.collectionIds }
          : {}),
      },
    });
```

- [ ] **Step 3: Update `EditBookmarkPanel`**

Hydrate from query:

```typescript
      notes: bookmarkQuery.data.notes ?? "",
```

becomes:

```typescript
      description: bookmarkQuery.data.description ?? "",
```

(and initial empty state `description: ""` instead of `notes: ""`).

Submit:

```typescript
    const trimmedDescription = values.description.trim();
    patchMutation.mutate({
      id,
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : null,
        collectionIds: values.collectionIds,
      },
    });
```

- [ ] **Step 4: Confirm no web `notes` left for bookmarks**

```bash
rg '\bnotes\b' apps/web/src/domains/bookmarks
```

Expected: no matches.

- [ ] **Step 5: Typecheck / build web**

```bash
pnpm --filter @bookmark-manager/web build
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add \
  apps/web/src/domains/bookmarks/components/BookmarkForm.tsx \
  apps/web/src/domains/bookmarks/components/CreateBookmarkPanel.tsx \
  apps/web/src/domains/bookmarks/components/EditBookmarkPanel.tsx
git commit -m "$(cat <<'EOF'
feat(web): align bookmark form field with description

EOF
)"
```

---

### Task 6: Apply migration + full verification

**Files:**
- None new (verification only). Touch living docs only if a `notes` mention for this field is found.

**Interfaces:**
- Consumes: all prior tasks

- [ ] **Step 1: Apply migration to local DB**

```bash
pnpm --filter @bookmark-manager/api exec prisma migrate deploy
```

Expected: applies `20260726191500_rename_bookmark_notes_to_description` (or reports already applied).

- [ ] **Step 2: Re-seed demo data**

```bash
pnpm --filter @bookmark-manager/api prisma:seed
```

Expected: exit 0; seed logs collections/bookmarks for candidate.

- [ ] **Step 3: Run API unit + e2e**

```bash
pnpm --filter @bookmark-manager/api test
pnpm --filter @bookmark-manager/api test:e2e
```

Expected: PASS (e2e may need API/DB running — use the project’s existing e2e setup).

- [ ] **Step 4: Repo-wide live-code scan for bookmark `notes`**

```bash
rg '\bnotes\b' apps/api/src apps/api/prisma packages/api-client/src/generated apps/web/src --glob '!**/node_modules/**'
```

Expected: no matches for the bookmark field (ignore unrelated English “notes” in comments/docs if any; there should be none in these live paths for this field).

- [ ] **Step 5: Manual smoke (if stack is up)**

1. Create bookmark with Description filled → response/list shows `description`.  
2. Edit bookmark → clear Description → persists as `null`.  
3. Confirm search `?q=` still matches title only.

- [ ] **Step 6: Commit only if verification forced a tiny fix; otherwise stop**

If a fix was required:

```bash
git add <fixed-files>
git commit -m "$(cat <<'EOF'
fix: finish notes to description rename leftovers

EOF
)"
```

If nothing to commit, leave working tree clean of rename work.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Prisma `notes` → `description` + RENAME COLUMN | 1 |
| OpenAPI / DTOs / services / unit fixtures | 2 |
| Seed catalog + writers | 3 |
| Orval regen | 4 |
| Web form + create/edit | 5 |
| Migrate deploy, tests, smoke, no live `notes` | 6 |
| Living docs only if needed; no historical plan rewrites | 6 (skip unless found) |
| Semantics + `q` title-only unchanged | 2 + 5 + 6 smoke |

**Placeholder scan:** none. **Type consistency:** `description` used end-to-end; UI label remains Description.
