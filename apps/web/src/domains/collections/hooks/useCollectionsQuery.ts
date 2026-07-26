import {
  getCollectionsControllerGetOneQueryKey,
  getCollectionsControllerListQueryKey,
  getSharesControllerListQueryKey,
} from "@bookmark-manager/api-client";
import { useQueryClient } from "@tanstack/react-query";

export function useCollectionsQuery() {
  const queryClient = useQueryClient();

  return {
    invalidateCollectionsList: () =>
      queryClient.invalidateQueries({
        queryKey: getCollectionsControllerListQueryKey(),
      }),
    invalidateCollection: (id: string) =>
      queryClient.invalidateQueries({
        queryKey: getCollectionsControllerGetOneQueryKey(id),
      }),
    invalidateShares: (collectionId: string) =>
      queryClient.invalidateQueries({
        queryKey: getSharesControllerListQueryKey(collectionId),
      }),
  };
}
