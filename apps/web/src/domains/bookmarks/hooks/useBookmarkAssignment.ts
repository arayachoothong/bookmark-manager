import {
  getBookmarksControllerListQueryKey,
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
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: [`/bookmarks/${bookmarkId}`],
        });
        options?.onSuccess?.();
      },
    },
  });
}
