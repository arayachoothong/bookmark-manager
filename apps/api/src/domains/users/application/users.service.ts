import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { JwtClaims } from "../../auth/infrastructure/jwt-verifier";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Auth0UserinfoClient } from "../infrastructure/auth0-userinfo.client";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth0Userinfo: Auth0UserinfoClient,
  ) {}

  async findOrCreateFromClaims(
    claims: JwtClaims,
    accessToken: string,
  ): Promise<User> {
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

    let email = claims.email;
    if (!email) {
      email = await this.auth0Userinfo.fetchEmail(accessToken);
    }

    if (email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (byEmail) {
        return this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            auth0Sub: claims.sub,
            ...(claims.email && claims.email !== byEmail.email
              ? { email: claims.email }
              : {}),
          },
        });
      }
    }

    if (!email) {
      throw new UnauthorizedException("Email claim required for first login");
    }

    return this.prisma.user.create({
      data: {
        auth0Sub: claims.sub,
        email,
      },
    });
  }
}
