import { Button, Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

import { BookmarkAccessRole } from "../constants/bookmark-access.constant";
import { bookmarkAccessRole } from "../helpers/bookmark-access.helper";
import type { BookmarksListProps } from "../interfaces/bookmarks-list.interface";

export function BookmarksList({
  bookmarks,
  currentUserId,
  deletingId,
  onDelete,
}: BookmarksListProps) {
  if (bookmarks.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No bookmarks yet. Create one above.
      </Typography>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {bookmarks.map((bookmark) => {
        const role = bookmarkAccessRole(currentUserId, bookmark.ownerId);
        const caption =
          role === BookmarkAccessRole.Owner
            ? "Owned by you"
            : "Shared collection (read-only)";

        return (
          <li key={bookmark.id}>
            <Stack
              direction="row"
              className="items-start justify-between gap-3 rounded border border-gray-200 px-3 py-2"
            >
              <Stack className="min-w-0 flex-1 gap-0.5">
                <Link
                  to={`/bookmarks/${bookmark.id}`}
                  className="truncate font-medium text-blue-800 no-underline hover:underline"
                >
                  {bookmark.title}
                </Link>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-gray-600 no-underline hover:underline"
                >
                  {bookmark.url}
                </a>
                <Typography variant="caption" color="text.secondary">
                  {caption}
                </Typography>
              </Stack>
              {role === BookmarkAccessRole.Owner ? (
                <Button
                  color="error"
                  size="small"
                  variant="outlined"
                  disabled={deletingId === bookmark.id}
                  onClick={() => onDelete(bookmark.id)}
                >
                  Delete
                </Button>
              ) : null}
            </Stack>
          </li>
        );
      })}
    </ul>
  );
}
