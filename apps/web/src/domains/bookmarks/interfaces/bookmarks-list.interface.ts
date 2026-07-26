import type { BookmarkResponse } from "@bookmark-manager/api-client";

export interface BookmarksListProps {
  bookmarks: BookmarkResponse[];
  currentUserId?: string;
  deletingId?: string;
  onDelete: (id: string) => void;
}
