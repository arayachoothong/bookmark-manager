import type { BookmarkResponse } from "@bookmark-manager/api-client";

export interface BookmarksListProps {
  bookmarks: BookmarkResponse[];
  currentUserId?: string;
  deletingId?: string;
  showAssign?: boolean;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
}
