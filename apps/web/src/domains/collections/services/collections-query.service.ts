import {
  getCollectionsControllerGetOneQueryKey,
  getCollectionsControllerListQueryKey,
  getSharesControllerListQueryKey,
} from "@bookmark-manager/api-client";
import type { QueryClient } from "@tanstack/react-query";

export function createCollectionsQueryService(queryClient: QueryClient) {
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
