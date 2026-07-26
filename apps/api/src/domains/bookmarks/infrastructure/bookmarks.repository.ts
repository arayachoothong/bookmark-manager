import { Injectable } from "@nestjs/common";
import type { Bookmark, Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

@Injectable()
export class BookmarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Bookmark | null> {
    return this.prisma.bookmark.findUnique({ where: { id } });
  }

  listReadableForUser(
    userId: string,
    collectionId?: string,
  ): Promise<Bookmark[]> {
    if (collectionId !== undefined) {
      return this.prisma.bookmark.findMany({
        where: { collectionId },
        orderBy: { updatedAt: "desc" },
      });
    }

    return this.prisma.bookmark.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            collection: {
              shares: { some: { granteeUserId: userId } },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  create(data: Prisma.BookmarkCreateInput): Promise<Bookmark> {
    return this.prisma.bookmark.create({ data });
  }

  update(id: string, data: Prisma.BookmarkUpdateInput): Promise<Bookmark> {
    return this.prisma.bookmark.update({ where: { id }, data });
  }

  delete(id: string): Promise<Bookmark> {
    return this.prisma.bookmark.delete({ where: { id } });
  }
}
