import {
  getBookmarksControllerGetOneQueryKey,
  getBookmarksControllerListQueryKey,
  getCollectionsControllerListBookmarksQueryKey,
} from "@bookmark-manager/api-client";
import type { QueryClient } from "@tanstack/react-query";

type InvalidateBookmarkCachesOptions = {
  bookmarkId?: string;
  collectionId?: string | null;
};

export function invalidateBookmarkCaches(
  queryClient: QueryClient,
  options?: InvalidateBookmarkCachesOptions,
): void {
  void queryClient.invalidateQueries({
    queryKey: getBookmarksControllerListQueryKey(),
  });

  const bookmarkId = options?.bookmarkId;
  if (typeof bookmarkId === "string" && bookmarkId.length > 0) {
    void queryClient.invalidateQueries({
      queryKey: getBookmarksControllerGetOneQueryKey(bookmarkId),
    });
  }

  const collectionId = options?.collectionId;
  if (typeof collectionId === "string" && collectionId.length > 0) {
    void queryClient.invalidateQueries({
      queryKey: getCollectionsControllerListBookmarksQueryKey(collectionId),
    });
  }

  void queryClient.invalidateQueries({
    predicate: (query) => {
      const first = query.queryKey[0];
      return (
        typeof first === "string" &&
        first.startsWith("/collections/") &&
        first.endsWith("/bookmarks")
      );
    },
  });
}
