import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import type { Collection, User } from "@prisma/client";
import { CollectionAccessService } from "../domain/collection-access.service";
import {
  CollectionsRepository,
  type CollectionBookmark,
} from "../infrastructure/collections.repository";
import type { CreateCollectionDto } from "../interface/dto/create-collection.dto";
import type { PatchCollectionDto } from "../interface/dto/patch-collection.dto";
import type { QueryCollectionsDto } from "../interface/dto/query-collections.dto";
import type { UpdateCollectionDto } from "../interface/dto/update-collection.dto";

function toCollectionResponse(collection: Collection) {
  return {
    id: collection.id,
    name: collection.name,
    ownerId: collection.ownerId,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

function toBookmarkResponse(bookmark: CollectionBookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    notes: bookmark.notes,
    collectionIds: bookmark.collections.map((row) => row.collectionId),
    ownerId: bookmark.ownerId,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

function assertNonEmptyName(name: unknown): string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new BadRequestException("name is required");
  }
  return name.trim();
}

function normalizeOptionalQuery(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

@Injectable()
export class CollectionsService {
  constructor(
    private readonly collectionsRepository: CollectionsRepository,
    private readonly collectionAccessService: CollectionAccessService,
  ) {}

  async listForUser(user: User, query: QueryCollectionsDto) {
    const q = normalizeOptionalQuery(query.q);
    const collections =
      await this.collectionsRepository.listReadableForUser(user.id, q);
    return collections.map(toCollectionResponse);
  }

  async getOne(user: User, id: string) {
    const collection = await this.collectionAccessService.getReadableOrThrow(
      user.id,
      id,
    );
    return toCollectionResponse(collection);
  }

  async create(user: User, dto: CreateCollectionDto) {
    const name = assertNonEmptyName(dto.name);
    const collection = await this.collectionsRepository.create(user.id, name);
    return toCollectionResponse(collection);
  }

  async replace(user: User, id: string, dto: UpdateCollectionDto) {
    await this.collectionAccessService.getWritableOrThrow(user.id, id);
    const name = assertNonEmptyName(dto.name);
    const collection = await this.collectionsRepository.update(id, { name });
    return toCollectionResponse(collection);
  }

  async patch(user: User, id: string, dto: PatchCollectionDto) {
    await this.collectionAccessService.getWritableOrThrow(user.id, id);
    if (dto.name === undefined) {
      throw new BadRequestException("name is required");
    }
    const name = assertNonEmptyName(dto.name);
    const collection = await this.collectionsRepository.update(id, { name });
    return toCollectionResponse(collection);
  }

  async remove(user: User, id: string) {
    await this.collectionAccessService.getWritableOrThrow(user.id, id);
    await this.collectionsRepository.delete(id);
  }

  async listBookmarks(user: User, id: string) {
    await this.collectionAccessService.getReadableOrThrow(user.id, id);
    const bookmarks =
      await this.collectionsRepository.listBookmarksInCollection(id);
    return bookmarks.map(toBookmarkResponse);
  }
}
