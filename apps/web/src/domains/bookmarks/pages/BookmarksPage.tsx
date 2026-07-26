import {
  getBookmarksControllerListQueryKey,
  useBookmarksControllerList,
  useBookmarksControllerRemove,
  useCollectionsControllerList,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack } from "@bookmark-manager/ui";
import { useAuth0 } from "@auth0/auth0-react";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";

import { BookmarksList } from "../components/BookmarksList";
import {
  CollectionFilter,
  useBookmarkCollectionFilterParam,
} from "../components/CollectionFilter";
import { CreateBookmarkForm } from "../components/CreateBookmarkForm";

export function BookmarksPage() {
  const queryClient = useQueryClient();
  const filterCollectionId = useBookmarkCollectionFilterParam();
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } =
    useAuth0();

  const listParams = filterCollectionId
    ? { collectionId: filterCollectionId }
    : undefined;

  const meQuery = useMeControllerMe({
    query: { enabled: isAuthenticated, queryKey: ["/me"] },
  });

  const collectionsQuery = useCollectionsControllerList({
    query: { enabled: isAuthenticated, queryKey: ["/collections"] },
  });

  const bookmarksQuery = useBookmarksControllerList(listParams, {
    query: {
      enabled: isAuthenticated,
      queryKey: getBookmarksControllerListQueryKey(listParams),
    },
  });

  const removeMutation = useBookmarksControllerRemove({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
      },
    },
  });

  if (isLoading) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading session…</Typography>
      </Stack>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack className="mx-auto max-w-3xl gap-4 p-6">
        <PageHeader title="Bookmarks" />
        <Button
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: "/bookmarks" },
            })
          }
        >
          Log in
        </Button>
      </Stack>
    );
  }

  const collections = collectionsQuery.data ?? [];

  return (
    <Stack className="mx-auto max-w-3xl gap-6 p-6">
      <PageHeader
        title="Bookmarks"
        subtitle={user?.email ?? undefined}
        actions={
          <Stack direction="row" className="items-center gap-2">
            <Link
              to="/collections"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
            >
              Collections
            </Link>
            <Button
              size="small"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
            >
              Log out
            </Button>
          </Stack>
        }
      />

      <CollectionFilter
        collections={collections}
        disabled={collectionsQuery.isLoading}
      />

      <CreateBookmarkForm
        collections={collections}
        defaultCollectionId={filterCollectionId}
      />

      {bookmarksQuery.isLoading ? (
        <Typography variant="body2">Loading bookmarks…</Typography>
      ) : bookmarksQuery.isError ? (
        <Typography color="error" variant="body2">
          Could not load bookmarks.
        </Typography>
      ) : meQuery.isLoading ? (
        <Typography variant="body2">Loading account…</Typography>
      ) : meQuery.isError || !meQuery.data ? (
        <Typography color="error" variant="body2">
          Could not load account.
        </Typography>
      ) : (
        <BookmarksList
          bookmarks={bookmarksQuery.data ?? []}
          currentUserId={meQuery.data.id}
          deletingId={
            removeMutation.isPending ? removeMutation.variables?.id : undefined
          }
          onDelete={(id) => removeMutation.mutate({ id })}
        />
      )}
    </Stack>
  );
}
