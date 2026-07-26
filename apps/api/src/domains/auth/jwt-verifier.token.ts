import type { createJwtVerifier } from "./infrastructure/jwt-verifier";

export const JWT_VERIFIER = Symbol("JWT_VERIFIER");

export type JwtVerifierFn = ReturnType<typeof createJwtVerifier>;
