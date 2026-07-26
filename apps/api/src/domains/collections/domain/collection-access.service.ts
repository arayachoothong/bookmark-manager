import { Inject, Injectable } from "@nestjs/common";
import { CollectionAccessRole } from "../constants/collection-access.constant";
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

  async resolveAccessRole(
    userId: string,
    collectionId: string,
  ): Promise<{
    role: CollectionAccessRole;
    collection: CollectionAccessRecord | null;
  }> {
    const collection =
      await this.collectionAccessPort.findCollectionById(collectionId);
    if (!collection) {
      return { role: CollectionAccessRole.None, collection: null };
    }
    if (collection.ownerId === userId) {
      return { role: CollectionAccessRole.Owner, collection };
    }
    const shared = await this.collectionAccessPort.hasShare(
      collectionId,
      userId,
    );
    return {
      role: shared ? CollectionAccessRole.Viewer : CollectionAccessRole.None,
      collection,
    };
  }

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
    const { role, collection } = await this.resolveAccessRole(
      userId,
      collectionId,
    );
    if (role === CollectionAccessRole.None || !collection) {
      throw new NotFoundError("Collection not found");
    }
    return collection;
  }

  async getWritableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    return this.assertCanWriteCollection(userId, collectionId);
  }

  async assertCanWriteCollection(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const { role, collection } = await this.resolveAccessRole(
      userId,
      collectionId,
    );
    if (role === CollectionAccessRole.Owner && collection) {
      return collection;
    }
    if (role === CollectionAccessRole.Viewer) {
      throw new ForbiddenError();
    }
    throw new NotFoundError("Collection not found");
  }
}
