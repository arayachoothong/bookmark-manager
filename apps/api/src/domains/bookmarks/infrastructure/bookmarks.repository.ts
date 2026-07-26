import { Injectable } from "@nestjs/common";
import type { Bookmark, Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const collectionsInclude = {
  collections: { select: { collectionId: true } },
} as const;

export type BookmarkWithCollections = Bookmark & {
  collections: { collectionId: string }[];
};

@Injectable()
export class BookmarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<BookmarkWithCollections | null> {
    return this.prisma.bookmark.findUnique({
      where: { id },
      include: collectionsInclude,
    });
  }

  listReadableForUser(
    userId: string,
    opts?: { collectionId?: string; q?: string },
  ): Promise<BookmarkWithCollections[]> {
    const titleFilter =
      opts?.q && opts.q.trim().length > 0
        ? { title: { contains: opts.q.trim(), mode: "insensitive" as const } }
        : {};

    if (opts?.collectionId) {
      return this.prisma.bookmark.findMany({
        where: {
          ...titleFilter,
          collections: { some: { collectionId: opts.collectionId } },
        },
        include: collectionsInclude,
        orderBy: { updatedAt: "desc" },
      });
    }

    return this.prisma.bookmark.findMany({
      where: {
        ...titleFilter,
        OR: [
          { ownerId: userId },
          {
            collections: {
              some: {
                collection: {
                  shares: { some: { granteeUserId: userId } },
                },
              },
            },
          },
        ],
      },
      include: collectionsInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  create(
    data: Prisma.BookmarkCreateInput,
  ): Promise<BookmarkWithCollections> {
    return this.prisma.bookmark.create({
      data,
      include: collectionsInclude,
    });
  }

  update(
    id: string,
    data: Prisma.BookmarkUpdateInput,
  ): Promise<BookmarkWithCollections> {
    return this.prisma.bookmark.update({
      where: { id },
      data,
      include: collectionsInclude,
    });
  }

  async setCollectionIds(
    bookmarkId: string,
    collectionIds: string[],
  ): Promise<BookmarkWithCollections> {
    const uniqueIds = [...new Set(collectionIds)];
    return this.prisma.$transaction(async (tx) => {
      await tx.bookmarkCollection.deleteMany({ where: { bookmarkId } });
      if (uniqueIds.length > 0) {
        await tx.bookmarkCollection.createMany({
          data: uniqueIds.map((collectionId) => ({
            bookmarkId,
            collectionId,
          })),
        });
      }
      return tx.bookmark.findUniqueOrThrow({
        where: { id: bookmarkId },
        include: collectionsInclude,
      });
    });
  }

  delete(id: string): Promise<Bookmark> {
    return this.prisma.bookmark.delete({ where: { id } });
  }
}
