import { Injectable } from "@nestjs/common";
import type { CollectionShare, User } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

export type ShareWithGrantee = CollectionShare & { grantee: User };

@Injectable()
export class SharesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createShare(
    collectionId: string,
    granteeUserId: string,
  ): Promise<ShareWithGrantee> {
    return this.prisma.collectionShare.upsert({
      where: {
        collectionId_granteeUserId: { collectionId, granteeUserId },
      },
      create: { collectionId, granteeUserId },
      update: {},
      include: { grantee: true },
    });
  }

  listByCollection(collectionId: string): Promise<ShareWithGrantee[]> {
    return this.prisma.collectionShare.findMany({
      where: { collectionId },
      include: { grantee: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async deleteShare(
    collectionId: string,
    granteeUserId: string,
  ): Promise<boolean> {
    const result = await this.prisma.collectionShare.deleteMany({
      where: { collectionId, granteeUserId },
    });
    return result.count > 0;
  }
}
