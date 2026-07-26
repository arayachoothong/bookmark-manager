import { Injectable } from "@nestjs/common";
import type { Bookmark, Collection, CollectionShare } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type {
  CollectionAccessPort,
  CollectionAccessRecord,
} from "../domain/collection-access.port";

@Injectable()
export class CollectionsRepository implements CollectionAccessPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Collection | null> {
    return this.prisma.collection.findUnique({ where: { id } });
  }

  async findCollectionById(id: string): Promise<CollectionAccessRecord | null> {
    const collection = await this.findById(id);
    if (!collection) {
      return null;
    }
    return {
      id: collection.id,
      name: collection.name,
      ownerId: collection.ownerId,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  async hasShare(
    collectionId: string,
    granteeUserId: string,
  ): Promise<boolean> {
    const share = await this.findShare(collectionId, granteeUserId);
    return share !== null;
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
