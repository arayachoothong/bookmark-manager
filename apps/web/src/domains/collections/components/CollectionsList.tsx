import { Button, Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

import {
  CollectionAccessRole,
  collectionAccessRole,
} from "../constants/collection-access.constant";
import type { CollectionsListProps } from "../interfaces/collections-list.interface";

export function CollectionsList({
  collections,
  currentUserId,
  deletingId,
  onDelete,
}: CollectionsListProps) {
  if (collections.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No collections yet. Create one above.
      </Typography>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {collections.map((collection) => {
        const role = collectionAccessRole(currentUserId, collection.ownerId);
        const caption =
          role === CollectionAccessRole.Owner
            ? "Owned by you"
            : "Shared with you (read-only)";

        return (
          <li key={collection.id}>
          <Stack
            direction="row"
            className="items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2"
          >
            <Stack className="min-w-0 flex-1 gap-0.5">
              <Link
                to={`/collections/${collection.id}`}
                className="truncate font-medium text-blue-800 no-underline hover:underline"
              >
                {collection.name}
              </Link>
              <Typography variant="caption" color="text.secondary">
                {caption}
              </Typography>
            </Stack>
            {role === CollectionAccessRole.Owner ? (
              <Button
                color="error"
                size="small"
                variant="outlined"
                disabled={deletingId === collection.id}
                onClick={() => onDelete(collection.id)}
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
