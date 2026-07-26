import {
  getCollectionsControllerListBookmarksQueryKey,
  useCollectionsControllerGetOne,
  useCollectionsControllerListBookmarks,
  useCollectionsControllerRemove,
  useCollectionsControllerRemoveBookmark,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, Loading, PageHeader, Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { AddExistingBookmarksModal } from "./AddExistingBookmarksModal";
import { CollectionNameForm } from "./CollectionNameForm";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { routeForQueryError } from "../../../lib/helpers/query-error-route.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { BookmarksList } from "../../bookmarks/components/BookmarksList";
import { invalidateBookmarkCaches } from "../../bookmarks/helpers/bookmark-query.helper";
import { CollectionAccessRole } from "../constants/collection-access.constant";
import { collectionAccessRole } from "../helpers/collection-access.helper";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CollectionDetailPanel() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const { invalidateCollection, invalidateCollectionsList } =
    useCollectionsQuery();
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [deleteCollectionOpen, setDeleteCollectionOpen] = useState(false);

  const canFetchApi = isApiAuthReady && Boolean(id);

  const meQuery = useMeControllerMe({
    query: {
      enabled: canFetchApi,
      queryKey: ["/me"],
    },
  });

  const collectionQuery = useCollectionsControllerGetOne(id, {
    query: {
      enabled: canFetchApi,
      queryKey: [`/collections/${id}`],
    },
  });

  const bookmarksQuery = useCollectionsControllerListBookmarks(id, {
    query: {
      enabled: canFetchApi && collectionQuery.isSuccess,
      queryKey: getCollectionsControllerListBookmarksQueryKey(id),
    },
  });

  const removeBookmarkMutation = useCollectionsControllerRemoveBookmark({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateBookmarkCaches(queryClient, {
          bookmarkId: variables.bookmarkId,
          collectionId: id,
        });
        showSuccess("Bookmark removed from collection.");
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(
            error,
            "Could not remove bookmark from collection.",
          ),
        );
      },
    },
  });

  const removeCollectionMutation = useCollectionsControllerRemove({
    mutation: {
      onSuccess: () => {
        void invalidateCollection(id);
        void invalidateCollectionsList();
        showSuccess("Collection deleted. Your bookmarks were kept.");
        navigate("/collections", { replace: true });
      },
      onError: (error) => {
        showError(getHttpErrorMessage(error, "Could not delete collection."));
      },
    },
  });

  if (!id) {
    return <Navigate to="/404" replace />;
  }

  const queryError =
    collectionQuery.error ?? meQuery.error ?? bookmarksQuery.error;
  if (queryError) {
    const route = routeForQueryError(queryError) ?? "/404";
    return <Navigate to={route} replace />;
  }

  if (
    !isApiAuthReady ||
    collectionQuery.isLoading ||
    meQuery.isLoading ||
    bookmarksQuery.isLoading
  ) {
    return <Loading label="Loading collection…" />;
  }

  if (!meQuery.data || !collectionQuery.data) {
    return <Navigate to="/404" replace />;
  }

  const collection = collectionQuery.data;
  const isOwner =
    collectionAccessRole(meQuery.data.id, collection.ownerId) ===
    CollectionAccessRole.Owner;

  return (
    <Stack className="gap-6">
      <PageHeader
        title={isOwner ? "Collection details" : collection.name}
        subtitle={
          isOwner ? "You own this collection" : "Shared with you (read-only)"
        }
        actions={
          <Link
            to="/collections"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
          >
            Back
          </Link>
        }
      />

      {isOwner ? (
        <CollectionNameForm
          collectionId={collection.id}
          initialName={collection.name}
          onDelete={() => setDeleteCollectionOpen(true)}
        />
      ) : null}

      <Stack className="gap-3">
        <Stack
          direction="row"
          className="items-center justify-between gap-3"
        >
          <Typography variant="h6">Bookmarks</Typography>
          {isOwner ? (
            <Stack direction="row" className="items-center gap-2">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setAddExistingOpen(true)}
              >
                Add existing
              </Button>
              <Link
                to={`/bookmarks/new?collectionId=${collection.id}`}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
              >
                Create new
              </Link>
            </Stack>
          ) : null}
        </Stack>
        <BookmarksList
          bookmarks={bookmarksQuery.data ?? []}
          currentUserId={meQuery.data.id}
          removingId={
            removeBookmarkMutation.isPending
              ? removeBookmarkMutation.variables?.bookmarkId
              : undefined
          }
          showAssign={false}
          onRemove={
            isOwner
              ? (bookmarkId) =>
                  removeBookmarkMutation.mutate({ id, bookmarkId })
              : undefined
          }
        />
      </Stack>

      <AddExistingBookmarksModal
        collectionId={collection.id}
        currentUserId={meQuery.data.id}
        open={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
      />

      <ConfirmDialog
        open={deleteCollectionOpen}
        title="Delete collection?"
        message="This deletes the collection, but your bookmarks will be kept."
        confirmLabel="Delete"
        destructive
        busy={removeCollectionMutation.isPending}
        onConfirm={() => removeCollectionMutation.mutate({ id })}
        onCancel={() => setDeleteCollectionOpen(false)}
      />
    </Stack>
  );
}
