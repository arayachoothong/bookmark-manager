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
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { getTestRs256KeyPair } from "./helpers/test-keys";
import {
  signTestAccessToken,
  TEST_AUTH0_AUDIENCE,
  TEST_AUTH0_ISSUER,
} from "./helpers/sign-test-access-token";

describe("Bookmark search and collection membership (e2e)", () => {
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
      get: (url: string) => auth(request(server).get(url)),
      post: (url: string) => auth(request(server).post(url)),
      patch: (url: string) => auth(request(server).patch(url)),
      delete: (url: string) => auth(request(server).delete(url)),
    };
  }

  it("GET /collections?q= filters by name", async () => {
    const owner = await authRequest(
      "auth0|search-collections",
      "search-collections@example.com",
    );
    await owner.post("/collections").send({ name: "Architecture" }).expect(201);
    await owner.post("/collections").send({ name: "Recipes" }).expect(201);

    const result = await owner.get("/collections?q=ARCH").expect(200);

    expect(result.body).toHaveLength(1);
    expect(result.body[0].name).toBe("Architecture");
  });

  it("GET /bookmarks?q= filters by title", async () => {
    const owner = await authRequest(
      "auth0|search-bookmarks",
      "search-bookmarks@example.com",
    );
    await owner
      .post("/bookmarks")
      .send({ url: "https://example.com/nest", title: "NestJS guide" })
      .expect(201);
    await owner
      .post("/bookmarks")
      .send({ url: "https://example.com/prisma", title: "Prisma guide" })
      .expect(201);

    const result = await owner.get("/bookmarks?q=NEST").expect(200);

    expect(result.body).toHaveLength(1);
    expect(result.body[0].title).toBe("NestJS guide");
  });

  it("combines q and collectionId filters", async () => {
    const owner = await authRequest(
      "auth0|combined-search",
      "combined-search@example.com",
    );
    const target = await owner
      .post("/collections")
      .send({ name: "Target" })
      .expect(201);
    const other = await owner
      .post("/collections")
      .send({ name: "Other" })
      .expect(201);
    await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/target-match",
        title: "Matching bookmark",
        collectionIds: [target.body.id],
      })
      .expect(201);
    await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/target-miss",
        title: "Different title",
        collectionIds: [target.body.id],
      })
      .expect(201);
    await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/other-match",
        title: "Matching elsewhere",
        collectionIds: [other.body.id],
      })
      .expect(201);

    const result = await owner
      .get(`/bookmarks?q=matching&collectionId=${target.body.id}`)
      .expect(200);

    expect(result.body).toHaveLength(1);
    expect(result.body[0].title).toBe("Matching bookmark");
  });

  it("POST /bookmarks accepts description and PATCH can clear it to null", async () => {
    const owner = await authRequest(
      "auth0|bookmark-description",
      "bookmark-description@example.com",
    );

    const created = await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/with-description",
        title: "With description",
        description: "Hello",
      })
      .expect(201);

    expect(created.body.description).toBe("Hello");

    const cleared = await owner
      .patch(`/bookmarks/${created.body.id}`)
      .send({ description: null })
      .expect(200);

    expect(cleared.body.description).toBeNull();
  });

  it("creates a bookmark with multiple collectionIds", async () => {
    const owner = await authRequest(
      "auth0|multi-create",
      "multi-create@example.com",
    );
    const first = await owner
      .post("/collections")
      .send({ name: "First" })
      .expect(201);
    const second = await owner
      .post("/collections")
      .send({ name: "Second" })
      .expect(201);

    const bookmark = await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/multiple",
        title: "Multiple collections",
        collectionIds: [first.body.id, second.body.id],
      })
      .expect(201);

    expect(bookmark.body.collectionIds).toHaveLength(2);
    expect(bookmark.body.collectionIds).toEqual(
      expect.arrayContaining([first.body.id, second.body.id]),
    );
  });

  it("PATCH collectionIds replaces the membership set", async () => {
    const owner = await authRequest(
      "auth0|replace-memberships",
      "replace-memberships@example.com",
    );
    const first = await owner
      .post("/collections")
      .send({ name: "First" })
      .expect(201);
    const second = await owner
      .post("/collections")
      .send({ name: "Second" })
      .expect(201);
    const bookmark = await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/replace",
        title: "Replace memberships",
        collectionIds: [first.body.id],
      })
      .expect(201);

    const updated = await owner
      .patch(`/bookmarks/${bookmark.body.id}`)
      .send({ collectionIds: [second.body.id] })
      .expect(200);

    expect(updated.body.collectionIds).toEqual([second.body.id]);
  });

  it("grantee can read a bookmark through any shared collection", async () => {
    const owner = await authRequest(
      "auth0|any-shared-owner",
      "any-shared-owner@example.com",
    );
    const grantee = await authRequest(
      "auth0|any-shared-grantee",
      "any-shared-grantee@example.com",
    );
    await grantee.get("/me").expect(200);
    const privateCollection = await owner
      .post("/collections")
      .send({ name: "Private membership" })
      .expect(201);
    const sharedCollection = await owner
      .post("/collections")
      .send({ name: "Shared membership" })
      .expect(201);
    const bookmark = await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/any-shared",
        title: "Readable through one membership",
        collectionIds: [privateCollection.body.id, sharedCollection.body.id],
      })
      .expect(201);
    await owner
      .post(`/collections/${sharedCollection.body.id}/shares`)
      .send({ email: "any-shared-grantee@example.com" })
      .expect(201);

    await grantee.get(`/bookmarks/${bookmark.body.id}`).expect(200);
  });

  it("POST membership is idempotent for the owner", async () => {
    const owner = await authRequest(
      "auth0|membership-owner",
      "membership-owner@example.com",
    );
    const collection = await owner
      .post("/collections")
      .send({ name: "Membership target" })
      .expect(201);
    const bookmark = await owner
      .post("/bookmarks")
      .send({ url: "https://example.com/add", title: "Add me" })
      .expect(201);
    const membershipUrl = `/collections/${collection.body.id}/bookmarks`;
    const payload = { bookmarkIds: [bookmark.body.id] };

    await owner.post(membershipUrl).send(payload).expect(201);
    await owner.post(membershipUrl).send(payload).expect(201);

    const memberships = await prisma.bookmarkCollection.findMany({
      where: {
        bookmarkId: bookmark.body.id,
        collectionId: collection.body.id,
      },
    });
    expect(memberships).toHaveLength(1);
  });

  it("DELETE membership unassigns without deleting the bookmark", async () => {
    const owner = await authRequest(
      "auth0|membership-delete",
      "membership-delete@example.com",
    );
    const collection = await owner
      .post("/collections")
      .send({ name: "Remove target" })
      .expect(201);
    const bookmark = await owner
      .post("/bookmarks")
      .send({
        url: "https://example.com/remove",
        title: "Keep bookmark",
        collectionIds: [collection.body.id],
      })
      .expect(201);

    await owner
      .delete(
        `/collections/${collection.body.id}/bookmarks/${bookmark.body.id}`,
      )
      .expect(200);

    const remaining = await owner
      .get(`/bookmarks/${bookmark.body.id}`)
      .expect(200);
    expect(remaining.body.collectionIds).toEqual([]);
  });

  it("viewer cannot POST membership", async () => {
    const owner = await authRequest(
      "auth0|viewer-membership-owner",
      "viewer-membership-owner@example.com",
    );
    const viewer = await authRequest(
      "auth0|viewer-membership-viewer",
      "viewer-membership-viewer@example.com",
    );
    await viewer.get("/me").expect(200);
    const collection = await owner
      .post("/collections")
      .send({ name: "Viewer collection" })
      .expect(201);
    const bookmark = await owner
      .post("/bookmarks")
      .send({ url: "https://example.com/viewer", title: "Owner bookmark" })
      .expect(201);
    await owner
      .post(`/collections/${collection.body.id}/shares`)
      .send({ email: "viewer-membership-viewer@example.com" })
      .expect(201);

    await viewer
      .post(`/collections/${collection.body.id}/bookmarks`)
      .send({ bookmarkIds: [bookmark.body.id] })
      .expect(403);
  });
});
