import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import {
  JWT_VERIFIER,
  type JwtVerifierFn,
} from "../src/domains/auth/jwt-verifier.token";
import { createJwtVerifier } from "../src/domains/auth/infrastructure/jwt-verifier";
import { getTestRs256KeyPair } from "./helpers/test-keys";
import {
  signTestAccessToken,
  TEST_AUTH0_AUDIENCE,
  TEST_AUTH0_ISSUER,
} from "./helpers/sign-test-access-token";
import { PrismaService } from "../src/shared/prisma/prisma.service";

describe("Collections privacy (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH0_ISSUER = TEST_AUTH0_ISSUER;
    process.env.AUTH0_AUDIENCE = TEST_AUTH0_AUDIENCE;

    const { publicKey } = await getTestRs256KeyPair();
    const verifyAccessToken: JwtVerifierFn = createJwtVerifier({
      issuer: TEST_AUTH0_ISSUER,
      audience: TEST_AUTH0_AUDIENCE,
      getKey: async () => publicKey,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JWT_VERIFIER)
      .useValue(verifyAccessToken)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.collectionShare.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.collection.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function authRequest(sub: string, email: string) {
    const token = await signTestAccessToken({ sub, email });
    const server = app.getHttpServer();
    const auth = (req: request.Test) =>
      req.set("Authorization", `Bearer ${token}`);
    return {
      token,
      get: (url: string) => auth(request(server).get(url)),
      post: (url: string) => auth(request(server).post(url)),
      patch: (url: string) => auth(request(server).patch(url)),
      delete: (url: string) => auth(request(server).delete(url)),
    };
  }

  it("user B cannot GET user A private collection (404)", async () => {
    const userA = await authRequest("auth0|col-a", "col-a@example.com");
    const userB = await authRequest("auth0|col-b", "col-b@example.com");

    const created = await userA
      .post("/collections")
      .send({ name: "Private" })
      .expect(201);

    const res = await userB.get(`/collections/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("user B cannot list user A collections", async () => {
    const userA = await authRequest("auth0|col-list-a", "col-list-a@example.com");
    const userB = await authRequest("auth0|col-list-b", "col-list-b@example.com");

    await userA.post("/collections").send({ name: "A only" }).expect(201);

    const listB = await userB.get("/collections").expect(200);
    expect(listB.body).toEqual([]);

    const meB = await userB.get("/me").expect(200);
    const meA = await userA.get("/me").expect(200);

    await prisma.collectionShare.create({
      data: {
        collectionId: (
          await userA.post("/collections").send({ name: "Shared" })
        ).body.id,
        granteeUserId: meB.body.id,
      },
    });

    const listAfterShare = await userB.get("/collections").expect(200);
    expect(listAfterShare.body).toHaveLength(1);
    expect(listAfterShare.body[0].ownerId).toBe(meA.body.id);
    expect(listAfterShare.body.map((c: { name: string }) => c.name)).not.toContain(
      "A only",
    );
  });

  it("DELETE collection nulls bookmark.collectionId and removes shares", async () => {
    const userA = await authRequest(
      "auth0|col-del-a",
      "col-del-a@example.com",
    );
    const userB = await authRequest(
      "auth0|col-del-b",
      "col-del-b@example.com",
    );

    const meA = await userA.get("/me").expect(200);
    const meB = await userB.get("/me").expect(200);

    const created = await userA
      .post("/collections")
      .send({ name: "To delete" })
      .expect(201);

    const bookmark = await prisma.bookmark.create({
      data: {
        url: "https://example.com",
        title: "Keep me",
        ownerId: meA.body.id,
        collectionId: created.body.id,
      },
    });

    await prisma.collectionShare.create({
      data: {
        collectionId: created.body.id,
        granteeUserId: meB.body.id,
      },
    });

    await userA.delete(`/collections/${created.body.id}`).expect(200);

    const updatedBookmark = await prisma.bookmark.findUnique({
      where: { id: bookmark.id },
    });
    expect(updatedBookmark?.collectionId).toBeNull();

    const shares = await prisma.collectionShare.findMany({
      where: { collectionId: created.body.id },
    });
    expect(shares).toHaveLength(0);
  });

  it("grantee can read shared collection but not mutate (403)", async () => {
    const userA = await authRequest(
      "auth0|col-share-a",
      "col-share-a@example.com",
    );
    const userB = await authRequest(
      "auth0|col-share-b",
      "col-share-b@example.com",
    );

    const meB = await userB.get("/me").expect(200);
    const created = await userA
      .post("/collections")
      .send({ name: "Shared read" })
      .expect(201);

    await prisma.collectionShare.create({
      data: {
        collectionId: created.body.id,
        granteeUserId: meB.body.id,
      },
    });

    await userB.get(`/collections/${created.body.id}`).expect(200);

    const patch = await userB
      .patch(`/collections/${created.body.id}`)
      .send({ name: "Hijack" });
    expect(patch.status).toBe(403);
  });
});
