import type { Collection } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "./collection.errors";
import { CollectionsRepository } from "../infrastructure/collections.repository";

@Injectable()
export class CollectionAccessService {
  constructor(private readonly collectionsRepository: CollectionsRepository) {}

  async getReadableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<Collection> {
    return this.assertCanReadCollection(userId, collectionId);
  }

  async assertCanReadCollection(
    userId: string,
    collectionId: string,
  ): Promise<Collection> {
    const collection =
      await this.collectionsRepository.findById(collectionId);
    if (!collection) {
      throw new NotFoundError("Collection not found");
    }
    if (collection.ownerId === userId) {
      return collection;
    }
    const share = await this.collectionsRepository.findShare(
      collectionId,
      userId,
    );
    if (share) {
      return collection;
    }
    throw new NotFoundError("Collection not found");
  }

  async getWritableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<Collection> {
    return this.assertCanWriteCollection(userId, collectionId);
  }

  async assertCanWriteCollection(
    userId: string,
    collectionId: string,
  ): Promise<Collection> {
    const collection =
      await this.collectionsRepository.findById(collectionId);
    if (!collection) {
      throw new NotFoundError("Collection not found");
    }
    if (collection.ownerId === userId) {
      return collection;
    }
    const share = await this.collectionsRepository.findShare(
      collectionId,
      userId,
    );
    if (share) {
      throw new ForbiddenError();
    }
    throw new NotFoundError("Collection not found");
  }
}
