import {
  getBookmarksControllerListQueryKey,
  useBookmarksControllerList,
  useBookmarksControllerRemove,
  useCollectionsControllerList,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Loading, NoData, PageHeader, Stack } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { AssignBookmarkModal } from "./AssignBookmarkModal";
import { BookmarksList } from "./BookmarksList";
import {
  CollectionFilter,
  useBookmarkCollectionFilterParam,
} from "./CollectionFilter";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { features } from "../../../config/features.config";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";

export function BookmarksScreen() {
  const queryClient = useQueryClient();
  const filterCollectionId = useBookmarkCollectionFilterParam();
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const [assignBookmarkId, setAssignBookmarkId] = useState<string | null>(null);
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<string | null>(null);

  const listParams = filterCollectionId
    ? { collectionId: filterCollectionId }
    : undefined;

  const meQuery = useMeControllerMe({
    query: { enabled: isApiAuthReady, queryKey: ["/me"] },
  });

  const collectionsQuery = useCollectionsControllerList({
    query: { enabled: isApiAuthReady, queryKey: ["/collections"] },
  });

  const bookmarksQuery = useBookmarksControllerList(listParams, {
    query: {
      enabled: isApiAuthReady,
      queryKey: getBookmarksControllerListQueryKey(listParams),
    },
  });

  const removeMutation = useBookmarksControllerRemove({
    mutation: {
      onSuccess: (_data, variables) => {
        const deleted = bookmarksQuery.data?.find(
          (bookmark) => bookmark.id === variables.id,
        );
        invalidateBookmarkCaches(queryClient, {
          bookmarkId: variables.id,
          collectionId: deleted?.collectionId,
        });
        showSuccess("Bookmark deleted.");
        setDeleteBookmarkId(null);
      },
      onError: (error) => {
        showError(getHttpErrorMessage(error, "Could not delete bookmark."));
      },
    },
  });

  useEffect(() => {
    if (bookmarksQuery.isError) {
      showError(
        getHttpErrorMessage(
          bookmarksQuery.error,
          "Could not load bookmarks.",
        ),
      );
    }
  }, [bookmarksQuery.isError, bookmarksQuery.error, showError]);

  useEffect(() => {
    if (meQuery.isError) {
      showError(getHttpErrorMessage(meQuery.error, "Could not load account."));
    }
  }, [meQuery.isError, meQuery.error, showError]);

  useEffect(() => {
    if (collectionsQuery.isError) {
      showError(
        getHttpErrorMessage(
          collectionsQuery.error,
          "Could not load collections.",
        ),
      );
    }
  }, [collectionsQuery.isError, collectionsQuery.error, showError]);

  if (
    !isApiAuthReady ||
    bookmarksQuery.isLoading ||
    meQuery.isLoading ||
    collectionsQuery.isLoading
  ) {
    return <Loading label="Loading bookmarks…" />;
  }

  if (bookmarksQuery.isError || meQuery.isError || !meQuery.data) {
    return <NoData message="Could not load bookmarks." />;
  }

  const bookmarks = bookmarksQuery.data ?? [];
  const assignBookmark = bookmarks.find(
    (bookmark) => bookmark.id === assignBookmarkId,
  );

  return (
    <Stack className="gap-6">
      <PageHeader
        title="Bookmarks"
        actions={
          features.createBookmark ? (
            <Link
              to="/bookmarks/new"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
            >
              New bookmark
            </Link>
          ) : undefined
        }
      />

      <CollectionFilter
        collections={collectionsQuery.data ?? []}
        disabled={collectionsQuery.isError}
      />

      <BookmarksList
        bookmarks={bookmarks}
        currentUserId={meQuery.data.id}
        deletingId={
          removeMutation.isPending ? removeMutation.variables?.id : undefined
        }
        onAssign={(id) => setAssignBookmarkId(id)}
        onDelete={(id) => setDeleteBookmarkId(id)}
      />

      <AssignBookmarkModal
        bookmarkId={assignBookmarkId ?? ""}
        currentCollectionId={assignBookmark?.collectionId}
        open={assignBookmarkId !== null}
        onClose={() => setAssignBookmarkId(null)}
      />

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
