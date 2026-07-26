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

describe("Collection shares (e2e)", () => {
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
      delete: (url: string) => auth(request(server).delete(url)),
    };
  }

  it("owner invites grantee by email; grantee can list and read but not patch", async () => {
    const owner = await authRequest(
      "auth0|share-owner",
      "share-owner@example.com",
    );
    const grantee = await authRequest(
      "auth0|share-grantee",
      "share-grantee@example.com",
    );
    await grantee.get("/me").expect(200);

    const created = await owner
      .post("/collections")
      .send({ name: "Share target" })
      .expect(201);

    const shareRes = await owner
      .post(`/collections/${created.body.id}/shares`)
      .send({ email: "share-grantee@example.com" })
      .expect(201);

    expect(shareRes.body).toMatchObject({
      email: "share-grantee@example.com",
    });
    expect(shareRes.body.granteeUserId).toBeDefined();

    const list = await grantee.get("/collections").expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);

    await grantee.get(`/collections/${created.body.id}`).expect(200);

    await grantee
      .patch(`/collections/${created.body.id}`)
      .send({ name: "Hijacked" })
      .expect(403);
  });

  it("POST share with unknown email returns 404", async () => {
    const owner = await authRequest(
      "auth0|share-unknown-owner",
      "share-unknown-owner@example.com",
    );

    const created = await owner
      .post("/collections")
      .send({ name: "No invitees" })
      .expect(201);

    await owner
      .post(`/collections/${created.body.id}/shares`)
      .send({ email: "nobody-here@example.com" })
      .expect(404);
  });

  it("owner lists and revokes shares; grantee loses access", async () => {
    const owner = await authRequest(
      "auth0|share-revoke-owner",
      "share-revoke-owner@example.com",
    );
    const grantee = await authRequest(
      "auth0|share-revoke-grantee",
      "share-revoke-grantee@example.com",
    );
    const meGrantee = await grantee.get("/me").expect(200);

    const created = await owner
      .post("/collections")
      .send({ name: "Revoke me" })
      .expect(201);

    await owner
      .post(`/collections/${created.body.id}/shares`)
      .send({ email: "share-revoke-grantee@example.com" })
      .expect(201);

    const shares = await owner
      .get(`/collections/${created.body.id}/shares`)
      .expect(200);
    expect(shares.body).toHaveLength(1);
    expect(shares.body[0].granteeUserId).toBe(meGrantee.body.id);

    await owner
      .delete(
        `/collections/${created.body.id}/shares/${meGrantee.body.id}`,
      )
      .expect(200);

    await grantee.get(`/collections/${created.body.id}`).expect(404);
  });

  it("grantee cannot manage shares (403)", async () => {
    const owner = await authRequest(
      "auth0|share-mgmt-owner",
      "share-mgmt-owner@example.com",
    );
    const grantee = await authRequest(
      "auth0|share-mgmt-grantee",
      "share-mgmt-grantee@example.com",
    );
    await grantee.get("/me").expect(200);

    const created = await owner
      .post("/collections")
      .send({ name: "Mgmt locked" })
      .expect(201);

    await owner
      .post(`/collections/${created.body.id}/shares`)
      .send({ email: "share-mgmt-grantee@example.com" })
      .expect(201);

    await grantee
      .post(`/collections/${created.body.id}/shares`)
      .send({ email: "share-mgmt-owner@example.com" })
      .expect(403);

    await grantee
      .get(`/collections/${created.body.id}/shares`)
      .expect(403);
  });
});
