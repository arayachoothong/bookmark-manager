import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import type { User } from "@prisma/client";
import { UsersService } from "../../users/application/users.service";
import { JWT_VERIFIER, type JwtVerifierFn } from "../jwt-verifier.token";
import type { JwtClaims } from "../infrastructure/jwt-verifier";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(JWT_VERIFIER) private readonly verifyAccessToken: JwtVerifierFn,
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

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

    let claims: JwtClaims;
    try {
      claims = await this.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException();
    }

    request.user = await this.usersService.findOrCreateFromClaims(claims);
    return true;
  }
}
