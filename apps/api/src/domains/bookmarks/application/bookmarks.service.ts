import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { CollectionAccessService } from "../../collections/domain/collection-access.service";
import { ForbiddenError } from "../../../shared/errors/forbidden.error";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import {
  BookmarksRepository,
  type BookmarkWithCollections,
} from "../infrastructure/bookmarks.repository";
import type { CreateBookmarkDto } from "../interface/dto/create-bookmark.dto";
import type { PatchBookmarkDto } from "../interface/dto/patch-bookmark.dto";
import type { QueryBookmarksDto } from "../interface/dto/query-bookmarks.dto";
import type { UpdateBookmarkDto } from "../interface/dto/update-bookmark.dto";

function toBookmarkResponse(bookmark: BookmarkWithCollections) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    collectionIds: bookmark.collections.map((row) => row.collectionId),
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

function normalizeOptionalQuery(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value.trim();
}

@Injectable()
export class BookmarksService {
  constructor(
    private readonly bookmarksRepository: BookmarksRepository,
    private readonly collectionAccessService: CollectionAccessService,
  ) {}

  async listForUser(user: User, query: QueryBookmarksDto) {
    const collectionId = normalizeOptionalQuery(query.collectionId);
    const q = normalizeOptionalQuery(query.q);

    if (collectionId !== undefined) {
      await this.collectionAccessService.getReadableOrThrow(
        user.id,
        collectionId,
      );
    }

    const bookmarks = await this.bookmarksRepository.listReadableForUser(
      user.id,
      { collectionId, q },
    );
    return bookmarks.map(toBookmarkResponse);
  }

  async getOne(user: User, id: string) {
    const bookmark = await this.assertCanReadBookmark(user.id, id);
    return toBookmarkResponse(bookmark);
  }

  async create(user: User, dto: CreateBookmarkDto) {
    const url = assertNonEmptyString(dto.url, "url");
    const title = assertNonEmptyString(dto.title, "title");

    for (const collectionId of dto.collectionIds ?? []) {
      await this.collectionAccessService.getWritableOrThrow(
        user.id,
        collectionId,
      );
    }
    const collectionIds = [...new Set(dto.collectionIds ?? [])];

    const bookmark = await this.bookmarksRepository.create({
      url,
      title,
      description: dto.description ?? null,
      owner: { connect: { id: user.id } },
      ...(collectionIds.length > 0
        ? {
            collections: {
              create: collectionIds.map((collectionId) => ({
                collection: { connect: { id: collectionId } },
              })),
            },
          }
        : {}),
    });

    return toBookmarkResponse(bookmark);
  }

  async replace(user: User, id: string, dto: UpdateBookmarkDto) {
    await this.assertCanMutateBookmark(user.id, id);
    const url = assertNonEmptyString(dto.url, "url");
    const title = assertNonEmptyString(dto.title, "title");

    if (dto.collectionIds !== undefined) {
      await this.assertCollectionsWritable(user.id, dto.collectionIds);
    }

    const data: Parameters<BookmarksRepository["update"]>[1] = {
      url,
      title,
      description: dto.description ?? null,
    };
    const bookmark =
      dto.collectionIds === undefined
        ? await this.bookmarksRepository.update(id, data)
        : await this.bookmarksRepository.updateWithCollectionIds(
            id,
            data,
            dto.collectionIds,
          );

    return toBookmarkResponse(bookmark);
  }

  async patch(user: User, id: string, dto: PatchBookmarkDto) {
    await this.assertCanMutateBookmark(user.id, id);

    if (dto.collectionIds !== undefined) {
      await this.assertCollectionsWritable(user.id, dto.collectionIds);
    }

    const data: Parameters<BookmarksRepository["update"]>[1] = {};
    if (dto.url !== undefined) {
      data.url = assertNonEmptyString(dto.url, "url");
    }
    if (dto.title !== undefined) {
      data.title = assertNonEmptyString(dto.title, "title");
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    const bookmark =
      dto.collectionIds === undefined
        ? await this.bookmarksRepository.update(id, data)
        : await this.bookmarksRepository.updateWithCollectionIds(
            id,
            data,
            dto.collectionIds,
          );
    return toBookmarkResponse(bookmark);
  }

  async remove(user: User, id: string) {
    await this.assertCanMutateBookmark(user.id, id);
    await this.bookmarksRepository.delete(id);
  }

  async addToCollection(
    user: User,
    collectionId: string,
    bookmarkIds: string[],
  ) {
    await this.collectionAccessService.getWritableOrThrow(
      user.id,
      collectionId,
    );
    for (const bookmarkId of bookmarkIds) {
      await this.assertCanMutateBookmark(user.id, bookmarkId);
    }
    return this.bookmarksRepository.addCollectionLinks(
      bookmarkIds,
      collectionId,
    );
  }

  async removeFromCollection(
    user: User,
    collectionId: string,
    bookmarkId: string,
  ) {
    await this.collectionAccessService.getWritableOrThrow(
      user.id,
      collectionId,
    );
    await this.assertCanMutateBookmark(user.id, bookmarkId);
    return this.bookmarksRepository.removeCollectionLink(
      bookmarkId,
      collectionId,
    );
  }

  private async assertCanReadBookmark(
    userId: string,
    bookmarkId: string,
  ): Promise<BookmarkWithCollections> {
    const bookmark = await this.bookmarksRepository.findById(bookmarkId);
    if (!bookmark) {
      throw new NotFoundError("Bookmark not found");
    }
    if (bookmark.ownerId === userId) {
      return bookmark;
    }
    if (await this.userCanReadBookmark(userId, bookmark)) {
      return bookmark;
    }
    throw new NotFoundError("Bookmark not found");
  }

  private async assertCanMutateBookmark(
    userId: string,
    bookmarkId: string,
  ): Promise<BookmarkWithCollections> {
    const bookmark = await this.bookmarksRepository.findById(bookmarkId);
    if (!bookmark) {
      throw new NotFoundError("Bookmark not found");
    }
    if (bookmark.ownerId === userId) {
      return bookmark;
    }
    if (await this.userCanReadBookmark(userId, bookmark)) {
      throw new ForbiddenError();
    }
    throw new NotFoundError("Bookmark not found");
  }

  private async userCanReadBookmark(
    userId: string,
    bookmark: BookmarkWithCollections,
  ): Promise<boolean> {
    if (bookmark.ownerId === userId) {
      return true;
    }
    for (const { collectionId } of bookmark.collections) {
      try {
        await this.collectionAccessService.getReadableOrThrow(
          userId,
          collectionId,
        );
        return true;
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }
    }
    return false;
  }

  private async assertCollectionsWritable(
    userId: string,
    collectionIds: string[],
  ): Promise<void> {
    for (const collectionId of collectionIds) {
      await this.collectionAccessService.getWritableOrThrow(
        userId,
        collectionId,
      );
    }
  }
}
