import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import type { Bookmark, User } from "@prisma/client";
import { CollectionAccessService } from "../../collections/domain/collection-access.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { BookmarksRepository } from "../infrastructure/bookmarks.repository";
import type { CreateBookmarkDto } from "../interface/dto/create-bookmark.dto";
import type { PatchBookmarkDto } from "../interface/dto/patch-bookmark.dto";
import type { QueryBookmarksDto } from "../interface/dto/query-bookmarks.dto";
import type { UpdateBookmarkDto } from "../interface/dto/update-bookmark.dto";

function toBookmarkResponse(bookmark: Bookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    notes: bookmark.notes,
    collectionId: bookmark.collectionId,
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
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
    if (query.collectionId !== undefined) {
      await this.collectionAccessService.getReadableOrThrow(
        user.id,
        query.collectionId,
      );
      const bookmarks = await this.bookmarksRepository.listReadableForUser(
        user.id,
        query.collectionId,
      );
      return bookmarks.map(toBookmarkResponse);
    }

    const bookmarks = await this.bookmarksRepository.listReadableForUser(
      user.id,
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

    if (dto.collectionId !== undefined) {
      await this.collectionAccessService.getOwnedOrThrow(
        user.id,
        dto.collectionId,
      );
    }

    const bookmark = await this.bookmarksRepository.create({
      url,
      title,
      notes: dto.notes ?? null,
      owner: { connect: { id: user.id } },
      ...(dto.collectionId !== undefined
        ? { collection: { connect: { id: dto.collectionId } } }
        : {}),
    });

    return toBookmarkResponse(bookmark);
  }

  async replace(user: User, id: string, dto: UpdateBookmarkDto) {
    await this.assertCanMutateBookmark(user.id, id);
    const url = assertNonEmptyString(dto.url, "url");
    const title = assertNonEmptyString(dto.title, "title");

    if (dto.collectionId !== undefined && dto.collectionId !== null) {
      await this.collectionAccessService.getOwnedOrThrow(
        user.id,
        dto.collectionId,
      );
    }

    const bookmark = await this.bookmarksRepository.update(id, {
      url,
      title,
      notes: dto.notes ?? null,
      collection:
        dto.collectionId === undefined
          ? undefined
          : dto.collectionId === null
            ? { disconnect: true }
            : { connect: { id: dto.collectionId } },
    });

    return toBookmarkResponse(bookmark);
  }

  async patch(user: User, id: string, dto: PatchBookmarkDto) {
    await this.assertCanMutateBookmark(user.id, id);

    if (dto.collectionId !== undefined && dto.collectionId !== null) {
      await this.collectionAccessService.getOwnedOrThrow(
        user.id,
        dto.collectionId,
      );
    }

    const data: Parameters<BookmarksRepository["update"]>[1] = {};
    if (dto.url !== undefined) {
      data.url = assertNonEmptyString(dto.url, "url");
    }
    if (dto.title !== undefined) {
      data.title = assertNonEmptyString(dto.title, "title");
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }
    if (dto.collectionId !== undefined) {
      data.collection =
        dto.collectionId === null
          ? { disconnect: true }
          : { connect: { id: dto.collectionId } };
    }

    const bookmark = await this.bookmarksRepository.update(id, data);
    return toBookmarkResponse(bookmark);
  }

  async remove(user: User, id: string) {
    await this.assertCanMutateBookmark(user.id, id);
    await this.bookmarksRepository.delete(id);
  }

  private async assertCanReadBookmark(
    userId: string,
    bookmarkId: string,
  ): Promise<Bookmark> {
    const bookmark = await this.bookmarksRepository.findById(bookmarkId);
    if (!bookmark) {
      throw new NotFoundError("Bookmark not found");
    }
    if (bookmark.ownerId === userId) {
      return bookmark;
    }
    if (bookmark.collectionId) {
      await this.collectionAccessService.getReadableOrThrow(
        userId,
        bookmark.collectionId,
      );
      return bookmark;
    }
    throw new NotFoundError("Bookmark not found");
  }

  private async assertCanMutateBookmark(
    userId: string,
    bookmarkId: string,
  ): Promise<Bookmark> {
    const bookmark = await this.bookmarksRepository.findById(bookmarkId);
    if (!bookmark || bookmark.ownerId !== userId) {
      throw new NotFoundError("Bookmark not found");
    }
    return bookmark;
  }
}
