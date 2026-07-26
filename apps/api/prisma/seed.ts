import { PrismaClient } from "@prisma/client";

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

  await ensureCollection(candidate.id, "Candidate private");
  await ensureCollection(alice.id, "Alice private");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
