import type { CollectionResponse } from "@bookmark-manager/api-client";

export interface CollectionsListProps {
  collections: CollectionResponse[];
  currentUserId?: string;
  deletingId?: string;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}
