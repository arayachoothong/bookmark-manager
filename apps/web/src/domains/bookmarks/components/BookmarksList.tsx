import { NoData } from "@bookmark-manager/ui";

import { BookmarkListItem } from "./BookmarkListItem";
import type { BookmarksListProps } from "../interfaces/bookmarks-list.interface";

export function BookmarksList({
  bookmarks,
  currentUserId,
  deletingId,
  removingId,
  showAssign = true,
  onAssign,
  onDelete,
  onRemove,
}: BookmarksListProps) {
  if (bookmarks.length === 0) {
    return <NoData message="No bookmarks yet." />;
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {bookmarks.map((bookmark) => (
        <BookmarkListItem
          key={bookmark.id}
          bookmark={bookmark}
          currentUserId={currentUserId}
          deletingId={deletingId}
          removingId={removingId}
          showAssign={showAssign}
          onAssign={onAssign}
          onDelete={onDelete}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
