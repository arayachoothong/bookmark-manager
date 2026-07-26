import { createRemoteJWKSet, jwtVerify } from "jose";
import { AllowedJwtAlg } from "../constants/jwt-alg.constant";

export type JwtClaims = { sub: string; email?: string };

export type JwtVerifierOptions = {
  issuer: string;
  audience: string;
  getKey: Parameters<typeof jwtVerify>[1];
};

export function createJwtVerifier(options: JwtVerifierOptions) {
  return async function verifyAccessToken(token: string): Promise<JwtClaims> {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      options.getKey,
      {
        issuer: options.issuer,
        audience: options.audience,
        algorithms: [AllowedJwtAlg.RS256],
      },
    );

    if (protectedHeader.alg !== AllowedJwtAlg.RS256) {
      throw new Error("Invalid algorithm: only RS256 allowed");
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("Missing sub");
    }

    const email =
      typeof payload.email === "string" ? payload.email : undefined;
    return { sub: payload.sub, email };
  };
}

export function createRemoteJwksVerifier(opts: {
  issuer: string;
  audience: string;
  jwksUri: string;
}) {
  const getKey = createRemoteJWKSet(new URL(opts.jwksUri));
  return createJwtVerifier({
    issuer: opts.issuer,
    audience: opts.audience,
    getKey,
  });
}
