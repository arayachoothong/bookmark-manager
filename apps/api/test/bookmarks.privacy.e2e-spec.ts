import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
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

describe("Bookmarks privacy (e2e)", () => {
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
    await prisma.bookmarkCollection.deleteMany();
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
      put: (url: string) => auth(request(server).put(url)),
      delete: (url: string) => auth(request(server).delete(url)),
    };
  }

  it("stranger cannot GET user A private bookmark (404)", async () => {
    const userA = await authRequest("auth0|bm-get-a", "bm-get-a@example.com");
    const stranger = await authRequest(
      "auth0|bm-get-stranger",
      "bm-get-stranger@example.com",
    );

    const created = await userA
      .post("/bookmarks")
      .send({
        url: "https://example.com/private",
        title: "Private",
      })
      .expect(201);

    const res = await stranger.get(`/bookmarks/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("stranger cannot PATCH user A bookmark (404)", async () => {
    const userA = await authRequest("auth0|bm-patch-a", "bm-patch-a@example.com");
    const stranger = await authRequest(
      "auth0|bm-patch-stranger",
      "bm-patch-stranger@example.com",
    );

    const created = await userA
      .post("/bookmarks")
      .send({ url: "https://example.com/p", title: "T" })
      .expect(201);

    const res = await stranger
      .patch(`/bookmarks/${created.body.id}`)
      .send({ title: "Stolen" });
    expect(res.status).toBe(404);
  });

  it("stranger cannot DELETE user A bookmark (404)", async () => {
    const userA = await authRequest("auth0|bm-del-a", "bm-del-a@example.com");
    const stranger = await authRequest(
      "auth0|bm-del-stranger",
      "bm-del-stranger@example.com",
    );

    const created = await userA
      .post("/bookmarks")
      .send({ url: "https://example.com/d", title: "Keep" })
      .expect(201);

    const res = await stranger.delete(`/bookmarks/${created.body.id}`);
    expect(res.status).toBe(404);

    await userA.get(`/bookmarks/${created.body.id}`).expect(200);
  });

  it("user B does not list user A uncategorized bookmarks", async () => {
    const userA = await authRequest("auth0|bm-list-a", "bm-list-a@example.com");
    const userB = await authRequest("auth0|bm-list-b", "bm-list-b@example.com");

    await userA
      .post("/bookmarks")
      .send({ url: "https://example.com/a-only", title: "A only" })
      .expect(201);

    const listB = await userB.get("/bookmarks").expect(200);
    expect(listB.body).toEqual([]);
  });

  it("grantee can GET bookmark in shared collection", async () => {
    const userA = await authRequest("auth0|bm-share-a", "bm-share-a@example.com");
    const userB = await authRequest("auth0|bm-share-b", "bm-share-b@example.com");

    const meB = await userB.get("/me").expect(200);
    const meA = await userA.get("/me").expect(200);

    const collection = await userA
      .post("/collections")
      .send({ name: "Shared col" })
      .expect(201);

    const bookmark = await userA
      .post("/bookmarks")
      .send({
        url: "https://example.com/shared",
        title: "In shared",
        collectionIds: [collection.body.id],
      })
      .expect(201);

    expect(bookmark.body.ownerId).toBe(meA.body.id);

    await prisma.collectionShare.create({
      data: {
        collectionId: collection.body.id,
        granteeUserId: meB.body.id,
      },
    });

    await userB.get(`/bookmarks/${bookmark.body.id}`).expect(200);
  });

  it("grantee cannot mutate bookmark in shared collection (403)", async () => {
    const userA = await authRequest(
      "auth0|bm-share-mut-a",
      "bm-share-mut-a@example.com",
    );
    const userB = await authRequest(
      "auth0|bm-share-mut-b",
      "bm-share-mut-b@example.com",
    );

    const meB = await userB.get("/me").expect(200);

    const collection = await userA
      .post("/collections")
      .send({ name: "Shared mutate" })
      .expect(201);

    const bookmark = await userA
      .post("/bookmarks")
      .send({
        url: "https://example.com/m",
        title: "Mine",
        collectionIds: [collection.body.id],
      })
      .expect(201);

    await prisma.collectionShare.create({
      data: {
        collectionId: collection.body.id,
        granteeUserId: meB.body.id,
      },
    });

    const patch = await userB
      .patch(`/bookmarks/${bookmark.body.id}`)
      .send({ title: "Hijack" });
    expect(patch.status).toBe(403);

    const del = await userB.delete(`/bookmarks/${bookmark.body.id}`);
    expect(del.status).toBe(403);
  });

  it("list filter ?collectionId= returns bookmarks in readable collection only", async () => {
    const userA = await authRequest("auth0|bm-filter-a", "bm-filter-a@example.com");
    const userB = await authRequest("auth0|bm-filter-b", "bm-filter-b@example.com");

    const meB = await userB.get("/me").expect(200);

    const col1 = await userA
      .post("/collections")
      .send({ name: "Col 1" })
      .expect(201);
    const col2 = await userA
      .post("/collections")
      .send({ name: "Col 2" })
      .expect(201);

    await userA
      .post("/bookmarks")
      .send({
        url: "https://example.com/1",
        title: "In col1",
        collectionIds: [col1.body.id],
      })
      .expect(201);
    await userA
      .post("/bookmarks")
      .send({
        url: "https://example.com/2",
        title: "In col2",
        collectionIds: [col2.body.id],
      })
      .expect(201);

    await prisma.collectionShare.create({
      data: {
        collectionId: col1.body.id,
        granteeUserId: meB.body.id,
      },
    });

    const filtered = await userB
      .get(`/bookmarks?collectionId=${col1.body.id}`)
      .expect(200);
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].title).toBe("In col1");

    const privateFilter = await userB.get(
      `/bookmarks?collectionId=${col2.body.id}`,
    );
    expect(privateFilter.status).toBe(404);
  });

  it("create with collectionIds requires writable collections (404 stranger, 403 grantee)", async () => {
    const userA = await authRequest("auth0|bm-create-a", "bm-create-a@example.com");
    const userB = await authRequest("auth0|bm-create-b", "bm-create-b@example.com");

    const meB = await userB.get("/me").expect(200);

    const collection = await userA
      .post("/collections")
      .send({ name: "Target" })
      .expect(201);

    const strangerCreate = await userB.post("/bookmarks").send({
      url: "https://example.com/x",
      title: "Nope",
      collectionIds: [collection.body.id],
    });
    expect(strangerCreate.status).toBe(404);

    await prisma.collectionShare.create({
      data: {
        collectionId: collection.body.id,
        granteeUserId: meB.body.id,
      },
    });

    const granteeCreate = await userB.post("/bookmarks").send({
      url: "https://example.com/y",
      title: "Also nope",
      collectionIds: [collection.body.id],
    });
    expect(granteeCreate.status).toBe(403);
  });
});
