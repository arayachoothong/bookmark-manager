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
import { Auth0UserinfoClient } from "../src/domains/users/infrastructure/auth0-userinfo.client";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { getTestRs256KeyPair } from "./helpers/test-keys";
import {
  signTestAccessToken,
  TEST_AUTH0_AUDIENCE,
  TEST_AUTH0_ISSUER,
} from "./helpers/sign-test-access-token";

describe("GET /me (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fetchEmailMock = jest.fn<Promise<string | undefined>, [string]>();

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
      .overrideProvider(Auth0UserinfoClient)
      .useValue({ fetchEmail: fetchEmailMock })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterEach(async () => {
    fetchEmailMock.mockReset();
    await prisma.collectionShare.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "me@example.com",
            "persisted@example.com",
            "seed-link@example.com",
            "userinfo@example.com",
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        auth0Sub: {
          in: [
            "auth0|me-1",
            "auth0|me-no-email",
            "auth0|seed-fake",
            "auth0|real-login",
            "auth0|userinfo-first",
            "auth0|no-email-new",
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /me without token returns 401", async () => {
    const res = await request(app.getHttpServer()).get("/me");
    expect(res.status).toBe(401);
  });

  it("GET /me with valid access token returns the user", async () => {
    const token = await signTestAccessToken({
      sub: "auth0|me-1",
      email: "me@example.com",
    });
    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@example.com");
    expect(res.body.auth0Sub).toBe("auth0|me-1");
    expect(res.body.id).toEqual(expect.any(String));
  });

  it("GET /me with token without email returns 200 for existing user", async () => {
    const sub = "auth0|me-no-email";
    const withEmail = await signTestAccessToken({
      sub,
      email: "persisted@example.com",
    });
    await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${withEmail}`)
      .expect(200);

    const withoutEmail = await signTestAccessToken({ sub });
    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${withoutEmail}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("persisted@example.com");
    expect(res.body.auth0Sub).toBe(sub);
  });

  it("links seeded user by email when Auth0 sub differs", async () => {
    const email = "seed-link@example.com";
    await prisma.user.create({
      data: { auth0Sub: "auth0|seed-fake", email },
    });

    const token = await signTestAccessToken({
      sub: "auth0|real-login",
      email,
    });
    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.auth0Sub).toBe("auth0|real-login");
    expect(res.body.email).toBe(email);

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.auth0Sub).toBe("auth0|real-login");
  });

  it("first login without email claim uses Auth0 userinfo", async () => {
    fetchEmailMock.mockResolvedValueOnce("userinfo@example.com");
    const token = await signTestAccessToken({ sub: "auth0|userinfo-first" });

    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("userinfo@example.com");
    expect(fetchEmailMock).toHaveBeenCalledWith(token);
  });

  it("GET /me first login without email returns 401 when userinfo has no email", async () => {
    fetchEmailMock.mockResolvedValueOnce(undefined);
    const token = await signTestAccessToken({ sub: "auth0|no-email-new" });

    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
