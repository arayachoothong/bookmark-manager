import { exportJWK, generateKeyPair, type CryptoKey, type JWK } from "jose";

let cached: Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  jwk: JWK;
}> | undefined;

/** RS256 keypair reused across tests to avoid slow regeneration. */
export function getTestRs256KeyPair() {
  if (!cached) {
    cached = (async () => {
      const { privateKey, publicKey } = await generateKeyPair("RS256");
      const jwk = await exportJWK(publicKey);
      jwk.kid = "test";
      jwk.alg = "RS256";
      return { privateKey, publicKey, jwk };
    })();
  }
  return cached;
}
