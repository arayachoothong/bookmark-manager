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
      description: bookmark.description,
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
