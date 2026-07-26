import type { CollectionResponse } from "@bookmark-manager/api-client";
import { Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

import { CollectionListItemActions } from "./CollectionListItemActions";
import { CollectionAccessRole } from "../constants/collection-access.constant";
import { collectionAccessRole } from "../helpers/collection-access.helper";

type CollectionListItemProps = {
  collection: CollectionResponse;
  currentUserId?: string;
  deletingId?: string;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionListItem({
  collection,
  currentUserId,
  deletingId,
  onShare,
  onDelete,
}: CollectionListItemProps) {
  const isOwner =
    collectionAccessRole(currentUserId, collection.ownerId) ===
    CollectionAccessRole.Owner;

  return (
    <li>
      <Stack
        direction="row"
        className="items-center justify-between gap-3 rounded-lg border border-gray-200 bg-[var(--surface)] px-4 py-3"
      >
        <Stack className="min-w-0 flex-1 gap-0.5">
          <Link
            to={`/collections/${collection.id}`}
            className="truncate font-medium text-[var(--ink)] no-underline hover:text-[var(--accent)]"
          >
            {collection.name}
          </Link>
          <Typography variant="caption" color="text.secondary">
            {isOwner ? "Owned by you" : "Shared with you (read-only)"}
          </Typography>
        </Stack>
        {isOwner ? (
          <CollectionListItemActions
            collectionId={collection.id}
            deleting={deletingId === collection.id}
            onShare={onShare}
            onDelete={onDelete}
          />
        ) : null}
      </Stack>
    </li>
  );
}
