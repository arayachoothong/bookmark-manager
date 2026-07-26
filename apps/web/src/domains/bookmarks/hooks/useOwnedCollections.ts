import { useCollectionsControllerList } from "@bookmark-manager/api-client";

import { useAuthToken } from "../../auth/hooks/useAuthToken";

export function useOwnedCollections(currentUserId?: string) {
  const { isApiAuthReady } = useAuthToken();

  const collectionsQuery = useCollectionsControllerList({
    query: { enabled: isApiAuthReady, queryKey: ["/collections"] },
  });

  const ownedCollections = (collectionsQuery.data ?? []).filter(
    (collection) =>
      currentUserId != null && collection.ownerId === currentUserId,
  );

  return {
    ownedCollections,
    isLoading: collectionsQuery.isLoading,
    isError: collectionsQuery.isError,
    error: collectionsQuery.error,
  };
}
