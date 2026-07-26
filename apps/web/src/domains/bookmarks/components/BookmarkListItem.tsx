import type { BookmarkResponse } from "@bookmark-manager/api-client";
import { Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

import { BookmarkListItemActions } from "./BookmarkListItemActions";
import { BookmarkAccessRole } from "../constants/bookmark-access.constant";
import { bookmarkAccessRole } from "../helpers/bookmark-access.helper";

type BookmarkListItemProps = {
  bookmark: BookmarkResponse;
  currentUserId?: string;
  deletingId?: string;
  showAssign?: boolean;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
};

export function BookmarkListItem({
  bookmark,
  currentUserId,
  deletingId,
  showAssign = true,
  onAssign,
  onDelete,
}: BookmarkListItemProps) {
  const role = bookmarkAccessRole(currentUserId, bookmark.ownerId);
  const isOwner = role === BookmarkAccessRole.Owner;
  const caption = isOwner
    ? "Owned by you"
    : "Shared collection (read-only)";

  return (
    <li>
      <Stack
        direction="row"
        className="items-start justify-between gap-3 rounded-lg border border-gray-200 bg-[var(--surface)] px-4 py-3"
      >
        <Stack className="min-w-0 flex-1 gap-0.5">
          <Link
            to={`/bookmarks/${bookmark.id}`}
            className="truncate font-medium text-[var(--ink)] no-underline hover:text-[var(--accent)]"
          >
            {bookmark.title}
          </Link>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-[var(--muted)] no-underline hover:text-[var(--accent)]"
          >
            {bookmark.url}
          </a>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        </Stack>
        {isOwner ? (
          <BookmarkListItemActions
            bookmarkId={bookmark.id}
            deleting={deletingId === bookmark.id}
            showAssign={showAssign}
            onAssign={onAssign}
            onDelete={onDelete}
          />
        ) : null}
      </Stack>
    </li>
  );
}
