import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  await prisma.collection.create({
    data: { name: "Candidate private", ownerId: candidate.id },
  });
  await prisma.collection.create({
    data: { name: "Alice private", ownerId: alice.id },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
