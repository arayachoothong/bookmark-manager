# Demo Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Prisma seed so a demo login sees 3 collections and 10 bookmarks with realistic many-to-many memberships.

**Architecture:** Keep the existing two-user seed (`candidate@test.com`, `alice@example.com`). Attach all demo collections/bookmarks to `candidate` (the interactive Auth0-linked user). Use idempotent helpers so re-running `prisma db seed` does not duplicate rows. Membership uses `BookmarkCollection` join rows.

**Tech Stack:** Prisma seed (`ts-node`), PostgreSQL, existing `pnpm --filter @bookmark-manager/api prisma:seed`.

## Global Constraints

- Spec intent: local demo data for UI walkthrough (3 collections, 10 bookmarks)
- Owner: `candidate@test.com` / `auth0|seed-candidate` (email-links to real Auth0 `sub` on first login when emails match — see README)
- Keep `alice@example.com` + “Alice private” for share/isolation demos
- Idempotent: safe to re-run seed; same names/titles must not create duplicates
- Many-to-many: some bookmarks belong to more than one collection; at least one bookmark unassigned
- YAGNI: no new CLI flags, no SEED_OWNER_EMAIL unless already present; no fake Auth0 users beyond the two existing
- Do not change API/web app behavior — seed + short README note only
- TDD: verify with a read-only Prisma query script / `prisma db seed` + SQL counts (no Nest e2e required for seed content)

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `apps/api/prisma/seed.ts` | Upsert 2 users; ensure 3 candidate collections; ensure 10 bookmarks + join memberships |
| `apps/api/prisma/seed-data.ts` | **Create** — static demo catalog (collection names, bookmark rows, membership map). One file, data only |
| `README.md` | One short note: re-seed command + that demo data lands on `candidate@test.com` |

---

### Task 1: Seed data catalog

**Files:**
- Create: `apps/api/prisma/seed-data.ts`

**Interfaces:**
- Produces:
  - `DEMO_COLLECTIONS: readonly ["Design reading", "Engineering", "Later"]`
  - `DEMO_BOOKMARKS: readonly { title: string; url: string; notes?: string; collections: readonly string[] }[]` length 10
  - Collection names in `collections` must be subset of `DEMO_COLLECTIONS`
  - Exactly one bookmark with `collections: []` (unassigned)
  - At least two bookmarks with 2+ collection names (M2M demo)

- [ ] **Step 1: Create the catalog file**

```typescript
// apps/api/prisma/seed-data.ts

export const DEMO_COLLECTIONS = [
  "Design reading",
  "Engineering",
  "Later",
] as const;

export type DemoCollectionName = (typeof DEMO_COLLECTIONS)[number];

export type DemoBookmarkSeed = {
  title: string;
  url: string;
  notes?: string;
  collections: readonly DemoCollectionName[];
};

export const DEMO_BOOKMARKS: readonly DemoBookmarkSeed[] = [
  {
    title: "Design Systems Handbook",
    url: "https://www.designsystems.com/handbook",
    notes: "Practical guide to design systems.",
    collections: ["Design reading", "Engineering"],
  },
  {
    title: "Inclusive Design Principles",
    url: "https://inclusivedesignprinciples.org",
    collections: ["Design reading"],
  },
  {
    title: "Refactoring UI",
    url: "https://www.refactoringui.com",
    notes: "Visual design tips for developers.",
    collections: ["Design reading", "Later"],
  },
  {
    title: "NestJS Documentation",
    url: "https://docs.nestjs.com",
    collections: ["Engineering"],
  },
  {
    title: "Prisma Docs",
    url: "https://www.prisma.io/docs",
    collections: ["Engineering"],
  },
  {
    title: "React Documentation",
    url: "https://react.dev",
    collections: ["Engineering", "Later"],
  },
  {
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    collections: ["Engineering"],
  },
  {
    title: "Web Accessibility Initiative",
    url: "https://www.w3.org/WAI/",
    collections: ["Design reading", "Later"],
  },
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    collections: ["Later"],
  },
  {
    title: "Uncategorized idea",
    url: "https://example.com/scratch",
    notes: "Not in any collection yet.",
    collections: [],
  },
];
```

- [ ] **Step 2: Sanity-check counts locally (node one-liner)**

Run from `apps/api`:

```bash
pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' -e '
const d = require("./prisma/seed-data");
if (d.DEMO_COLLECTIONS.length !== 3) throw new Error("need 3 collections");
if (d.DEMO_BOOKMARKS.length !== 10) throw new Error("need 10 bookmarks");
const unassigned = d.DEMO_BOOKMARKS.filter((b) => b.collections.length === 0);
const multi = d.DEMO_BOOKMARKS.filter((b) => b.collections.length >= 2);
if (unassigned.length !== 1) throw new Error("need exactly 1 unassigned");
if (multi.length < 2) throw new Error("need >=2 multi-membership bookmarks");
console.log("seed-data OK", { collections: 3, bookmarks: 10, multi: multi.length });
'
```

Expected: `seed-data OK { collections: 3, bookmarks: 10, multi: 4 }` (or similar multi ≥ 2)

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed-data.ts
git commit -m "chore(api): add demo seed catalog for collections and bookmarks"
```

---

### Task 2: Idempotent seed writers + wire `seed.ts`

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: `DEMO_COLLECTIONS`, `DEMO_BOOKMARKS` from `./seed-data`
- Produces: after seed, candidate owns 3 named collections and 10 bookmarks with join rows matching the catalog

- [ ] **Step 1: Rewrite `seed.ts`**

Replace file contents with:

```typescript
import { PrismaClient } from "@prisma/client";
import { DEMO_BOOKMARKS, DEMO_COLLECTIONS } from "./seed-data";

const prisma = new PrismaClient();

async function ensureCollection(ownerId: string, name: string) {
  const existing = await prisma.collection.findFirst({
    where: { ownerId, name },
  });
  if (existing) {
    return existing;
  }
  return prisma.collection.create({
    data: { name, ownerId },
  });
}

async function ensureBookmark(
  ownerId: string,
  input: {
    title: string;
    url: string;
    notes?: string;
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
        notes: input.notes ?? null,
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

  const have = new Set(existing.collections.map((row) => row.collectionId));
  const missing = input.collectionIds.filter((id) => !have.has(id));
  if (missing.length > 0) {
    await prisma.bookmarkCollection.createMany({
      data: missing.map((collectionId) => ({
        bookmarkId: existing.id,
        collectionId,
      })),
      skipDuplicates: true,
    });
  }

  if (input.notes !== undefined && existing.notes !== (input.notes ?? null)) {
    await prisma.bookmark.update({
      where: { id: existing.id },
      data: { notes: input.notes ?? null },
    });
  }

  return existing;
}

async function main() {
  const candidate = await prisma.user.upsert({
    where: { email: "candidate@test.com" },
    update: {},
    create: {
      email: "candidate@test.com",
      auth0Sub: "auth0|seed-candidate",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      auth0Sub: "auth0|seed-alice",
    },
  });

  await ensureCollection(alice.id, "Alice private");

  const collectionByName = new Map<string, string>();
  for (const name of DEMO_COLLECTIONS) {
    const collection = await ensureCollection(candidate.id, name);
    collectionByName.set(name, collection.id);
  }

  for (const bookmark of DEMO_BOOKMARKS) {
    const collectionIds = bookmark.collections.map((name) => {
      const id = collectionByName.get(name);
      if (!id) {
        throw new Error(`Unknown demo collection: ${name}`);
      }
      return id;
    });
    await ensureBookmark(candidate.id, {
      title: bookmark.title,
      url: bookmark.url,
      notes: bookmark.notes,
      collectionIds,
    });
  }

  const collectionCount = await prisma.collection.count({
    where: { ownerId: candidate.id, name: { in: [...DEMO_COLLECTIONS] } },
  });
  const bookmarkCount = await prisma.bookmark.count({
    where: { ownerId: candidate.id },
  });
  console.log(
    `Seeded demo for ${candidate.email}: ${collectionCount} collections, ${bookmarkCount} bookmarks`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Run seed**

```bash
pnpm --filter @bookmark-manager/api prisma:seed
```

Expected stdout includes:
`Seeded demo for candidate@test.com: 3 collections, 10 bookmarks`

- [ ] **Step 3: Re-run seed (idempotency)**

```bash
pnpm --filter @bookmark-manager/api prisma:seed
```

Expected: same log line; no error.

Then verify counts (from `apps/api`):

```bash
pnpm exec prisma db execute --stdin <<'SQL'
SELECT
  (SELECT COUNT(*) FROM "Collection" c
     JOIN "User" u ON u.id = c."ownerId"
     WHERE u.email = 'candidate@test.com'
       AND c.name IN ('Design reading','Engineering','Later')) AS collections,
  (SELECT COUNT(*) FROM "Bookmark" b
     JOIN "User" u ON u.id = b."ownerId"
     WHERE u.email = 'candidate@test.com') AS bookmarks,
  (SELECT COUNT(*) FROM "BookmarkCollection" bc
     JOIN "Bookmark" b ON b.id = bc."bookmarkId"
     JOIN "User" u ON u.id = b."ownerId"
     WHERE u.email = 'candidate@test.com') AS memberships;
SQL
```

If `db execute` requires `--url`, use:

```bash
pnpm exec prisma db execute --url "$DATABASE_URL" --stdin <<'SQL'
...same SQL...
SQL
```

Expected: `collections = 3`, `bookmarks >= 10` (exactly 10 if DB was clean of prior candidate bookmarks with other titles), `memberships` equals the number of `(bookmark, collection)` pairs in the catalog (count them: Design Systems Handbook 2 + Inclusive 1 + Refactoring 2 + Nest 1 + Prisma 1 + React 2 + TS 1 + WAI 2 + MDN 1 + Uncategorized 0 = **13**).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "chore(api): seed 3 demo collections and 10 bookmarks for candidate"
```

---

### Task 3: README note

**Files:**
- Modify: `README.md` (seed section near existing `prisma:seed` instructions)

- [ ] **Step 1: Add a short demo-data note**

Near the existing seed command, add:

```markdown
Demo data: `prisma:seed` creates **3 collections** and **10 bookmarks** owned by `candidate@test.com` (plus Alice’s private collection for share demos). On first Auth0 login, if your token email matches `candidate@test.com`, the API links that user and the demo rows appear. To use your own Auth0 email, change the candidate email in `apps/api/prisma/seed.ts` before seeding.
```

Keep it to a few sentences — do not rewrite the whole README.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: note demo seed collections and bookmarks"
```

---

## Spec coverage checklist

| Requirement | Task |
| --- | --- |
| 3 collections | 1–2 |
| 10 bookmarks | 1–2 |
| Demo-friendly ownership via existing candidate user | 2 |
| M2M memberships + one unassigned | 1–2 |
| Idempotent re-seed | 2 |
| Document how to see data after Auth0 login | 3 |

## Notes for implementers

- Do not delete Alice or her collection — share e2e / manual share demos still use her email.
- Matching bookmarks by `(ownerId, title, url)` is enough for idempotency; do not wipe the DB in seed.
- If `bookmarks >= 10` after a dirty DB, that is OK; the three named collections must still exist.
