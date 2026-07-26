import { Module, forwardRef } from "@nestjs/common";
import { createRemoteJwksVerifier } from "./infrastructure/jwt-verifier";
import { JWT_VERIFIER, type JwtVerifierFn } from "./jwt-verifier.token";
import { AccessTokenGuard } from "./interface/access-token.guard";
import { UsersModule } from "../users/users.module";

function createProductionVerifier(): JwtVerifierFn {
  const issuer = process.env.AUTH0_ISSUER;
  const audience = process.env.AUTH0_AUDIENCE;
  if (!issuer || !audience) {
    throw new Error("AUTH0_ISSUER and AUTH0_AUDIENCE must be set");
  }
  const jwksUri = `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
  return createRemoteJwksVerifier({ issuer, audience, jwksUri });
}

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [
    {
      provide: JWT_VERIFIER,
      useFactory: () => createProductionVerifier(),
    },
    AccessTokenGuard,
  ],
  exports: [JWT_VERIFIER, AccessTokenGuard],
})
export class AuthModule {}
