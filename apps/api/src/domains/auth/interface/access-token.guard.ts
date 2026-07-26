import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { UsersService } from "../../users/application/users.service";
import { JWT_VERIFIER, type JwtVerifierFn } from "../jwt-verifier.token";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(JWT_VERIFIER) private readonly verifyAccessToken: JwtVerifierFn,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: User }>();
    const authorization = request.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      throw new UnauthorizedException();
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const claims = await this.verifyAccessToken(token);
      request.user = await this.usersService.findOrCreateFromClaims(claims);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
