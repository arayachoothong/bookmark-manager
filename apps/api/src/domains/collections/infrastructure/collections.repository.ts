import { Injectable } from "@nestjs/common";
import type { Bookmark, Collection, CollectionShare } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Collection | null> {
    return this.prisma.collection.findUnique({ where: { id } });
  }

  findShare(
    collectionId: string,
    granteeUserId: string,
  ): Promise<CollectionShare | null> {
    return this.prisma.collectionShare.findUnique({
      where: {
        collectionId_granteeUserId: { collectionId, granteeUserId },
      },
    });
  }

  listReadableForUser(userId: string): Promise<Collection[]> {
    return this.prisma.collection.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { granteeUserId: userId } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  create(ownerId: string, name: string): Promise<Collection> {
    return this.prisma.collection.create({
      data: { ownerId, name },
    });
  }

  update(
    id: string,
    data: { name: string },
  ): Promise<Collection> {
    return this.prisma.collection.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<Collection> {
    return this.prisma.collection.delete({ where: { id } });
  }

  listBookmarksInCollection(collectionId: string): Promise<Bookmark[]> {
    return this.prisma.bookmark.findMany({
      where: { collectionId },
      orderBy: { updatedAt: "desc" },
    });
  }
}
