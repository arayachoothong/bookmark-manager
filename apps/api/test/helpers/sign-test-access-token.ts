import { SignJWT } from "jose";
import { getTestRs256KeyPair } from "./test-keys";

export const TEST_AUTH0_ISSUER = "https://dev-yg.us.auth0.com/";
export const TEST_AUTH0_AUDIENCE = "https://bbl-candidate-test-api";

export async function signTestAccessToken(claims: {
  sub: string;
  email?: string;
}): Promise<string> {
  const { privateKey } = await getTestRs256KeyPair();
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(TEST_AUTH0_ISSUER)
    .setAudience(TEST_AUTH0_AUDIENCE)
    .setSubject(claims.sub)
    .setExpirationTime("2h")
    .sign(privateKey);
}
