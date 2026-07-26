import { useBookmarksControllerPatch } from "@bookmark-manager/api-client";
import { useQueryClient } from "@tanstack/react-query";

import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";

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
        invalidateBookmarkCaches(queryClient, {
          bookmarkId,
          collectionId: variables.data.collectionId,
        });
        options?.onSuccess?.();
      },
    },
  });
}
