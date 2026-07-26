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

describe("GET /me (e2e)", () => {
  let app: INestApplication;

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
});
