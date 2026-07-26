import {
  getBookmarksControllerGetOneQueryKey,
  getBookmarksControllerListQueryKey,
  getCollectionsControllerListBookmarksQueryKey,
  useBookmarksControllerPatch,
} from "@bookmark-manager/api-client";
import { useQueryClient } from "@tanstack/react-query";

type UseBookmarkAssignmentOptions = {
  onSuccess?: () => void;
};

export function useBookmarkAssignment(
  bookmarkId: string,
  options?: UseBookmarkAssignmentOptions,
) {
  const queryClient = useQueryClient();

  return useBookmarksControllerPatch({
    mutation: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerGetOneQueryKey(bookmarkId),
        });

        const nextCollectionId = variables.data.collectionId;
        if (typeof nextCollectionId === "string" && nextCollectionId.length > 0) {
          void queryClient.invalidateQueries({
            queryKey:
              getCollectionsControllerListBookmarksQueryKey(nextCollectionId),
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

        options?.onSuccess?.();
      },
    },
  });
}
