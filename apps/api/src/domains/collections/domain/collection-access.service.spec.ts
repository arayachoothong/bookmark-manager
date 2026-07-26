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
});
