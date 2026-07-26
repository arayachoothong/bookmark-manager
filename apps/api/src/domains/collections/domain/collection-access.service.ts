import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "./collection.errors";
import {
  COLLECTION_ACCESS_PORT,
  type CollectionAccessPort,
  type CollectionAccessRecord,
} from "./collection-access.port";

@Injectable()
export class CollectionAccessService {
  constructor(
    @Inject(COLLECTION_ACCESS_PORT)
    private readonly collectionAccessPort: CollectionAccessPort,
  ) {}

  async getReadableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    return this.assertCanReadCollection(userId, collectionId);
  }

  async assertCanReadCollection(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const collection =
      await this.collectionAccessPort.findCollectionById(collectionId);
    if (!collection) {
      throw new NotFoundError("Collection not found");
    }
    if (collection.ownerId === userId) {
      return collection;
    }
    const shared = await this.collectionAccessPort.hasShare(
      collectionId,
      userId,
    );
    if (shared) {
      return collection;
    }
    throw new NotFoundError("Collection not found");
  }

  async getWritableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    return this.assertCanWriteCollection(userId, collectionId);
  }

  async getOwnedOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const collection =
      await this.collectionAccessPort.findCollectionById(collectionId);
    if (!collection || collection.ownerId !== userId) {
      throw new NotFoundError("Collection not found");
    }
    return collection;
  }

  async assertCanWriteCollection(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const collection =
      await this.collectionAccessPort.findCollectionById(collectionId);
    if (!collection) {
      throw new NotFoundError("Collection not found");
    }
    if (collection.ownerId === userId) {
      return collection;
    }
    const shared = await this.collectionAccessPort.hasShare(
      collectionId,
      userId,
    );
    if (shared) {
      throw new ForbiddenError();
    }
    throw new NotFoundError("Collection not found");
  }
}
