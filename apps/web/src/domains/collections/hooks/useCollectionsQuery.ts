import { useQueryClient } from "@tanstack/react-query";

import { createCollectionsQueryService } from "../services/collections-query.service";

export function useCollectionsQuery() {
  const queryClient = useQueryClient();
  return createCollectionsQueryService(queryClient);
}
