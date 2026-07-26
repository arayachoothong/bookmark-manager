export const COLLECTION_ACCESS_PORT = Symbol("COLLECTION_ACCESS_PORT");

export type CollectionAccessRecord = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface CollectionAccessPort {
  findCollectionById(id: string): Promise<CollectionAccessRecord | null>;
  hasShare(collectionId: string, granteeUserId: string): Promise<boolean>;
}
