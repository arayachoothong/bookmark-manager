import type { Collection } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "./collection.errors";
import { CollectionAccessService } from "./collection-access.service";
import { CollectionsRepository } from "../infrastructure/collections.repository";

describe("CollectionAccessService", () => {
  const ownerId = "owner-1";
  const granteeId = "grantee-1";
  const strangerId = "stranger-1";
  const collectionId = "col-1";

  const collection: Collection = {
    id: collectionId,
    name: "Reading",
    ownerId,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  let repository: jest.Mocked<
    Pick<
      CollectionsRepository,
      "findById" | "findShare"
    >
  >;
  let service: CollectionAccessService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findShare: jest.fn(),
    };
    service = new CollectionAccessService(
      repository as unknown as CollectionsRepository,
    );
  });

  it("owner can read and write", async () => {
    repository.findById.mockResolvedValue(collection);

    await expect(
      service.assertCanReadCollection(ownerId, collectionId),
    ).resolves.toEqual(collection);
    await expect(
      service.assertCanWriteCollection(ownerId, collectionId),
    ).resolves.toEqual(collection);
    expect(repository.findShare).not.toHaveBeenCalled();
  });

  it("grantee can read but not write", async () => {
    repository.findById.mockResolvedValue(collection);
    repository.findShare.mockResolvedValue({
      id: "share-1",
      collectionId,
      granteeUserId: granteeId,
      createdAt: new Date(),
    });

    await expect(
      service.assertCanReadCollection(granteeId, collectionId),
    ).resolves.toEqual(collection);

    await expect(
      service.assertCanWriteCollection(granteeId, collectionId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stranger read returns not found", async () => {
    repository.findById.mockResolvedValue(collection);
    repository.findShare.mockResolvedValue(null);

    await expect(
      service.assertCanReadCollection(strangerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      service.assertCanWriteCollection(strangerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("missing collection returns not found for read and write", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.assertCanReadCollection(ownerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.assertCanWriteCollection(ownerId, collectionId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
