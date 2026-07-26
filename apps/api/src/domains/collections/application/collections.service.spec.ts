import type { User } from "@prisma/client";
import { CollectionAccessService } from "../domain/collection-access.service";
import { CollectionsRepository } from "../infrastructure/collections.repository";
import { CollectionsService } from "./collections.service";

describe("CollectionsService", () => {
  const user = {
    id: "user-1",
    auth0Sub: "auth0|user-1",
    email: "user@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  } satisfies User;

  let repository: jest.Mocked<CollectionsRepository>;
  let collectionAccess: jest.Mocked<CollectionAccessService>;
  let service: CollectionsService;

  beforeEach(() => {
    repository = {
      listReadableForUser: jest.fn(),
      listBookmarksInCollection: jest.fn(),
    } as unknown as jest.Mocked<CollectionsRepository>;
    collectionAccess = {
      getReadableOrThrow: jest.fn(),
    } as unknown as jest.Mocked<CollectionAccessService>;
    service = new CollectionsService(repository, collectionAccess);
  });

  it("normalizes the collection search query", async () => {
    repository.listReadableForUser.mockResolvedValue([]);

    await service.listForUser(user, { q: "  Projects  " });

    expect(repository.listReadableForUser).toHaveBeenCalledWith(
      user.id,
      "Projects",
    );
  });

  it("omits an empty collection search query", async () => {
    repository.listReadableForUser.mockResolvedValue([]);

    await service.listForUser(user, { q: "   " });

    expect(repository.listReadableForUser).toHaveBeenCalledWith(
      user.id,
      undefined,
    );
  });

  it("returns collectionIds for bookmarks in a collection", async () => {
    repository.listBookmarksInCollection.mockResolvedValue([
      {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example",
        description: null,
        ownerId: user.id,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        collections: [
          { collectionId: "collection-1" },
          { collectionId: "collection-2" },
        ],
      },
    ]);

    await expect(
      service.listBookmarks(user, "collection-1"),
    ).resolves.toMatchObject([
      {
        id: "bookmark-1",
        collectionIds: ["collection-1", "collection-2"],
      },
    ]);
  });
});
