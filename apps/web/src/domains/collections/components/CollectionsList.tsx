import { NoData } from "@bookmark-manager/ui";

import { CollectionListItem } from "./CollectionListItem";
import type { CollectionsListProps } from "../interfaces/collections-list.interface";

export function CollectionsList({
  collections,
  currentUserId,
  deletingId,
  onShare,
  onDelete,
}: CollectionsListProps) {
  if (collections.length === 0) {
    return (
      <NoData message="No collections yet. Use Create ▸ New collection to add one." />
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {collections.map((collection) => (
        <CollectionListItem
          key={collection.id}
          collection={collection}
          currentUserId={currentUserId}
          deletingId={deletingId}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
