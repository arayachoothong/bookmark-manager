import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { JwtClaims } from "../../auth/infrastructure/jwt-verifier";
import { PrismaService } from "../../../shared/prisma/prisma.service";

/**
 * First login requires `email` on the access token (e.g. Auth0 Action on login)
 * until userinfo-based enrichment is added. Returning users are matched by `sub` only.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateFromClaims(claims: JwtClaims): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { auth0Sub: claims.sub },
    });

    if (existing) {
      if (claims.email && claims.email !== existing.email) {
        return this.prisma.user.update({
          where: { auth0Sub: claims.sub },
          data: { email: claims.email },
        });
      }
      return existing;
    }

    if (!claims.email) {
      throw new UnauthorizedException("Email claim required for first login");
    }

    return this.prisma.user.create({
      data: {
        auth0Sub: claims.sub,
        email: claims.email,
      },
    });
  }
}
