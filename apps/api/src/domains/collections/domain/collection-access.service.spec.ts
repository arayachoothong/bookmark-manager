import { CollectionAccessRole } from "../constants/collection-access.constant";
import { ForbiddenError, NotFoundError } from "./collection.errors";
import { CollectionAccessService } from "./collection-access.service";
import type { CollectionAccessPort, CollectionAccessRecord } from "./collection-access.port";

describe("CollectionAccessService", () => {
  const ownerId = "owner-1";
  const granteeId = "grantee-1";
  const strangerId = "stranger-1";
  const collectionId = "col-1";

  const collection: CollectionAccessRecord = {
    id: collectionId,
    name: "Reading",
    ownerId,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  let port: jest.Mocked<CollectionAccessPort>;
  let service: CollectionAccessService;

  beforeEach(() => {
    port = {
      findCollectionById: jest.fn(),
      hasShare: jest.fn(),
    };
    service = new CollectionAccessService(port);
  });

  it("owner can read and write", async () => {
    port.findCollectionById.mockResolvedValue(collection);

    await expect(
      service.assertCanReadCollection(ownerId, collectionId),
    ).resolves.toEqual(collection);
    await expect(
      service.assertCanWriteCollection(ownerId, collectionId),
    ).resolves.toEqual(collection);
    expect(port.hasShare).not.toHaveBeenCalled();
  });

  it("grantee can read but not write", async () => {
    port.findCollectionById.mockResolvedValue(collection);
    port.hasShare.mockResolvedValue(true);

    await expect(
      service.assertCanReadCollection(granteeId, collectionId),
    ).resolves.toEqual(collection);

    await expect(
      service.assertCanWriteCollection(granteeId, collectionId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stranger read returns not found", async () => {
    port.findCollectionById.mockResolvedValue(collection);
    port.hasShare.mockResolvedValue(false);

    await expect(
      service.assertCanReadCollection(strangerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      service.assertCanWriteCollection(strangerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("missing collection returns not found for read and write", async () => {
    port.findCollectionById.mockResolvedValue(null);

    await expect(
      service.assertCanReadCollection(ownerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.assertCanWriteCollection(ownerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("resolveAccessRole", () => {
    it("returns Owner for the owner without checking shares", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      const result = await service.resolveAccessRole(ownerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.Owner);
      expect(result.collection).toEqual(collection);
      expect(port.hasShare).not.toHaveBeenCalled();
    });

    it("returns Viewer for a grantee", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      port.hasShare.mockResolvedValue(true);
      const result = await service.resolveAccessRole(granteeId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.Viewer);
      expect(result.collection).toEqual(collection);
    });

    it("returns None for a stranger", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      port.hasShare.mockResolvedValue(false);
      const result = await service.resolveAccessRole(strangerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.None);
    });

    it("returns None when the collection is missing", async () => {
      port.findCollectionById.mockResolvedValue(null);
      const result = await service.resolveAccessRole(ownerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.None);
      expect(result.collection).toBeNull();
    });
  });
});
