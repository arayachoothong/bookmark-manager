import type { User } from "@prisma/client";
import { CollectionAccessService } from "../../collections/domain/collection-access.service";
import { ForbiddenError } from "../../../shared/errors/forbidden.error";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import {
  BookmarksRepository,
  type BookmarkWithCollections,
} from "../infrastructure/bookmarks.repository";
import { BookmarksService } from "./bookmarks.service";

describe("BookmarksService", () => {
  const user = {
    id: "user-1",
    auth0Sub: "auth0|user-1",
    email: "user@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  } satisfies User;

  const bookmark = (
    overrides: Partial<BookmarkWithCollections> = {},
  ): BookmarkWithCollections => ({
    id: "bookmark-1",
    url: "https://example.com",
    title: "Example",
    notes: null,
    ownerId: user.id,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    collections: [{ collectionId: "collection-1" }],
    ...overrides,
  });

  let repository: jest.Mocked<BookmarksRepository>;
  let collectionAccess: jest.Mocked<CollectionAccessService>;
  let service: BookmarksService;
  let updateWithCollectionIds: jest.Mock;

  beforeEach(() => {
    updateWithCollectionIds = jest.fn();
    repository = {
      findById: jest.fn(),
      listReadableForUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setCollectionIds: jest.fn(),
      updateWithCollectionIds,
      addCollectionLinks: jest.fn(),
      removeCollectionLink: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<BookmarksRepository>;
    collectionAccess = {
      getReadableOrThrow: jest.fn(),
      getWritableOrThrow: jest.fn(),
    } as unknown as jest.Mocked<CollectionAccessService>;
    service = new BookmarksService(repository, collectionAccess);
  });

  it("normalizes list filters and returns collectionIds", async () => {
    repository.listReadableForUser.mockResolvedValue([bookmark()]);

    await expect(
      service.listForUser(user, {
        collectionId: " collection-1 ",
        q: " Example ",
      }),
    ).resolves.toMatchObject([{ collectionIds: ["collection-1"] }]);

    expect(collectionAccess.getReadableOrThrow).toHaveBeenCalledWith(
      user.id,
      "collection-1",
    );
    expect(repository.listReadableForUser).toHaveBeenCalledWith(user.id, {
      collectionId: "collection-1",
      q: "Example",
    });
  });

  it("creates join rows after validating every collection", async () => {
    repository.create.mockResolvedValue(
      bookmark({
        collections: [
          { collectionId: "collection-1" },
          { collectionId: "collection-2" },
        ],
      }),
    );

    await service.create(user, {
      url: " https://example.com ",
      title: " Example ",
      collectionIds: ["collection-1", "collection-2"],
    });

    expect(collectionAccess.getWritableOrThrow).toHaveBeenCalledTimes(2);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        title: "Example",
        collections: {
          create: [
            { collection: { connect: { id: "collection-1" } } },
            { collection: { connect: { id: "collection-2" } } },
          ],
        },
      }),
    );
  });

  it("replaces collection memberships when collectionIds are present", async () => {
    repository.findById.mockResolvedValue(bookmark());
    updateWithCollectionIds.mockResolvedValue(
      bookmark({ collections: [{ collectionId: "collection-2" }] }),
    );

    const result = await service.replace(user, "bookmark-1", {
      url: "https://example.com",
      title: "Example",
      collectionIds: ["collection-2"],
    });

    expect(updateWithCollectionIds).toHaveBeenCalledWith(
      "bookmark-1",
      {
        url: "https://example.com",
        title: "Example",
        notes: null,
      },
      ["collection-2"],
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.setCollectionIds).not.toHaveBeenCalled();
    expect(result.collectionIds).toEqual(["collection-2"]);
  });

  it("atomically patches fields and collection memberships", async () => {
    repository.findById.mockResolvedValue(bookmark());
    updateWithCollectionIds.mockResolvedValue(
      bookmark({
        title: "Updated",
        collections: [{ collectionId: "collection-2" }],
      }),
    );

    await service.patch(user, "bookmark-1", {
      title: "Updated",
      collectionIds: ["collection-2"],
    });

    expect(updateWithCollectionIds).toHaveBeenCalledWith(
      "bookmark-1",
      { title: "Updated" },
      ["collection-2"],
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.setCollectionIds).not.toHaveBeenCalled();
  });

  it("leaves memberships unchanged when patch omits collectionIds", async () => {
    repository.findById.mockResolvedValue(bookmark());
    repository.update.mockResolvedValue(bookmark({ title: "Updated" }));

    await service.patch(user, "bookmark-1", { title: "Updated" });

    expect(repository.setCollectionIds).not.toHaveBeenCalled();
  });

  it("allows a non-owner to read through any readable collection", async () => {
    repository.findById.mockResolvedValue(
      bookmark({
        ownerId: "other-user",
        collections: [
          { collectionId: "hidden" },
          { collectionId: "shared" },
        ],
      }),
    );
    collectionAccess.getReadableOrThrow
      .mockRejectedValueOnce(new NotFoundError())
      .mockResolvedValueOnce({} as never);

    await expect(service.getOne(user, "bookmark-1")).resolves.toMatchObject({
      id: "bookmark-1",
    });
  });

  it("forbids mutation by a readable non-owner", async () => {
    repository.findById.mockResolvedValue(
      bookmark({ ownerId: "other-user" }),
    );
    collectionAccess.getReadableOrThrow.mockResolvedValue({} as never);

    await expect(
      service.patch(user, "bookmark-1", { title: "Nope" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("hides mutation from a non-readable non-owner", async () => {
    repository.findById.mockResolvedValue(
      bookmark({ ownerId: "other-user" }),
    );
    collectionAccess.getReadableOrThrow.mockRejectedValue(new NotFoundError());

    await expect(service.remove(user, "bookmark-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("adds and removes memberships only for owned bookmarks", async () => {
    repository.findById.mockResolvedValue(bookmark());

    await service.addToCollection(user, "collection-2", ["bookmark-1"]);
    await service.removeFromCollection(user, "collection-2", "bookmark-1");

    expect(collectionAccess.getWritableOrThrow).toHaveBeenCalledTimes(2);
    expect(repository.addCollectionLinks).toHaveBeenCalledWith(
      ["bookmark-1"],
      "collection-2",
    );
    expect(repository.removeCollectionLink).toHaveBeenCalledWith(
      "bookmark-1",
      "collection-2",
    );
  });
});
