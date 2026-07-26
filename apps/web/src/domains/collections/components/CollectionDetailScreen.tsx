import {
  getBookmarksControllerListQueryKey,
  getCollectionsControllerListBookmarksQueryKey,
  useBookmarksControllerRemove,
  useCollectionsControllerGetOne,
  useCollectionsControllerListBookmarks,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Loading, NoData, PageHeader, Stack } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";

import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { routeForQueryError } from "../../../lib/helpers/query-error-route.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { BookmarksList } from "../../bookmarks/components/BookmarksList";
import { CollectionAccessRole } from "../constants/collection-access.constant";
import { collectionAccessRole } from "../helpers/collection-access.helper";

export function CollectionDetailScreen() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<string | null>(null);

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

  const removeMutation = useBookmarksControllerRemove({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getCollectionsControllerListBookmarksQueryKey(id),
        });
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
        showSuccess("Bookmark deleted.");
        setDeleteBookmarkId(null);
      },
      onError: (error) => {
        showError(getHttpErrorMessage(error, "Could not delete bookmark."));
      },
    },
  });

  if (!id) {
    return <Navigate to="/404" replace />;
  }

  if (collectionQuery.isError) {
    const route = routeForQueryError(collectionQuery.error) ?? "/404";
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

  if (meQuery.isError || !meQuery.data || !collectionQuery.data) {
    return <NoData message="Could not load collection." />;
  }

  const collection = collectionQuery.data;
  const isOwner =
    collectionAccessRole(meQuery.data.id, collection.ownerId) ===
    CollectionAccessRole.Owner;

  return (
    <Stack className="gap-6">
      <PageHeader
        title={collection.name}
        subtitle={
          isOwner ? "You own this collection" : "Shared with you (read-only)"
        }
        actions={
          <Stack direction="row" className="items-center gap-2">
            {isOwner ? (
              <Link
                to={`/bookmarks/new?collectionId=${collection.id}`}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
              >
                Add bookmark
              </Link>
            ) : null}
            <Link
              to="/collections"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
            >
              Back
            </Link>
          </Stack>
        }
      />

      {bookmarksQuery.isError ? (
        <NoData message="Could not load bookmarks." />
      ) : (
        <BookmarksList
          bookmarks={bookmarksQuery.data ?? []}
          currentUserId={meQuery.data.id}
          deletingId={
            removeMutation.isPending ? removeMutation.variables?.id : undefined
          }
          showAssign={false}
          onAssign={() => undefined}
          onDelete={(bookmarkId) => setDeleteBookmarkId(bookmarkId)}
        />
      )}

      <ConfirmDialog
        open={deleteBookmarkId !== null}
        title="Delete bookmark?"
        message="This permanently deletes the bookmark. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteBookmarkId) {
            removeMutation.mutate({ id: deleteBookmarkId });
          }
        }}
        onCancel={() => setDeleteBookmarkId(null)}
      />
    </Stack>
  );
}
