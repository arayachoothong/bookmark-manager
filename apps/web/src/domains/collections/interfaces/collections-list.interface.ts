import type { CollectionResponse } from "@bookmark-manager/api-client";

export interface CollectionsListProps {
  collections: CollectionResponse[];
  currentUserId?: string;
  deletingId?: string;
  onDelete: (id: string) => void;
}
