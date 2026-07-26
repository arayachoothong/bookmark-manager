import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { JwtClaims } from "../../auth/infrastructure/jwt-verifier";
import { PrismaService } from "../../../shared/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateFromClaims(claims: JwtClaims): Promise<User> {
    if (!claims.email) {
      throw new UnauthorizedException();
    }

    return this.prisma.user.upsert({
      where: { auth0Sub: claims.sub },
      create: {
        auth0Sub: claims.sub,
        email: claims.email,
      },
      update: {
        email: claims.email,
      },
    });
  }
}
