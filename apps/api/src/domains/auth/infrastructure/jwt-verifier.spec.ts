import { generateKeyPair, SignJWT } from "jose";
import { createJwtVerifier } from "./jwt-verifier";

describe("createJwtVerifier", () => {
  const issuer = "https://dev-yg.us.auth0.com/";
  const audience = "https://bbl-candidate-test-api";

  it("accepts a valid RS256 access token", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");

    const token = await new SignJWT({ email: "candidate@test.com" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).resolves.toMatchObject({
      sub: "auth0|abc",
      email: "candidate@test.com",
    });
  });

  it("rejects HS256 tokens even if signature would otherwise verify", async () => {
    const secret = new TextEncoder().encode("super-secret-key-for-hs256-tests!!");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(secret);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => secret,
    });

    await expect(verify(token)).rejects.toThrow(/algorithm|alg|RS256/i);
  });

  it("rejects wrong audience", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience("https://wrong-audience")
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).rejects.toThrow();
  });

  it("rejects wrong issuer", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://wrong-issuer.example/")
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("-1h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).rejects.toThrow();
  });
});
