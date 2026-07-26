import {
  getBookmarksControllerListQueryKey,
  useBookmarksControllerGetOne,
  useBookmarksControllerRemove,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack } from "@bookmark-manager/ui";
import { useAuth0 } from "@auth0/auth0-react";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";

import { useAuthToken } from "../../auth/hooks/useAuthToken";
import {
  BookmarkAccessRole,
  bookmarkAccessRole,
} from "../constants/bookmark-access.constant";

export function BookmarkDetailScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { isApiAuthReady } = useAuthToken();
  const canFetchApi = isAuthenticated && isApiAuthReady && Boolean(id);

  const meQuery = useMeControllerMe({
    query: {
      enabled: canFetchApi,
      queryKey: ["/me"],
    },
  });

  const bookmarkQuery = useBookmarksControllerGetOne(id, {
    query: {
      enabled: canFetchApi,
      queryKey: [`/bookmarks/${id}`],
    },
  });

  const removeMutation = useBookmarksControllerRemove({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
        navigate("/bookmarks", { replace: true });
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
        <PageHeader title="Bookmark" />
        <Button
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: `/bookmarks/${id}` },
            })
          }
        >
          Log in
        </Button>
      </Stack>
    );
  }

  if (!id) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Missing bookmark id.</Typography>
      </Stack>
    );
  }

  if (bookmarkQuery.isLoading) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading bookmark…</Typography>
      </Stack>
    );
  }

  if (bookmarkQuery.isError) {
    return (
      <Stack className="mx-auto max-w-3xl gap-4 p-6">
        <PageHeader title="Bookmark" />
        <Typography color="error" variant="body2">
          Bookmark not found or you do not have access.
        </Typography>
        <Link
          to="/bookmarks"
          className="text-sm text-blue-800 no-underline hover:underline"
        >
          Back to bookmarks
        </Link>
      </Stack>
    );
  }

  const bookmark = bookmarkQuery.data;
  if (!bookmark) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading bookmark…</Typography>
      </Stack>
    );
  }

  if (meQuery.isLoading) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading account…</Typography>
      </Stack>
    );
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <Stack className="mx-auto max-w-3xl gap-4 p-6">
        <PageHeader title={bookmark.title} />
        <Typography color="error" variant="body2">
          Could not load account.
        </Typography>
        <Link
          to="/bookmarks"
          className="text-sm text-blue-800 no-underline hover:underline"
        >
          Back to bookmarks
        </Link>
      </Stack>
    );
  }

  const role = bookmarkAccessRole(meQuery.data.id, bookmark.ownerId);
  const isOwner = role === BookmarkAccessRole.Owner;

  return (
    <Stack className="mx-auto max-w-3xl gap-6 p-6">
      <PageHeader
        title={bookmark.title}
        subtitle={
          isOwner ? "You own this bookmark" : "Shared collection (read-only)"
        }
        actions={
          <Link
            to="/bookmarks"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
          >
            Back
          </Link>
        }
      />

      <Stack className="gap-2">
        <Typography variant="body2" color="text.secondary">
          URL
        </Typography>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className="break-all text-blue-800 no-underline hover:underline"
        >
          {bookmark.url}
        </a>
      </Stack>

      {bookmark.notes ? (
        <Stack className="gap-1">
          <Typography variant="body2" color="text.secondary">
            Notes
          </Typography>
          <Typography variant="body2">{bookmark.notes}</Typography>
        </Stack>
      ) : null}

      {bookmark.collectionId ? (
        <Stack className="gap-1">
          <Typography variant="body2" color="text.secondary">
            Collection
          </Typography>
          <Link
            to={`/collections/${bookmark.collectionId}`}
            className="text-sm text-blue-800 no-underline hover:underline"
          >
            View collection
          </Link>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Not in a collection
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary">
        Updated {new Date(bookmark.updatedAt).toLocaleString()}
      </Typography>

      {isOwner ? (
        <Button
          color="error"
          variant="outlined"
          disabled={removeMutation.isPending}
          onClick={() => removeMutation.mutate({ id: bookmark.id })}
        >
          Delete bookmark
        </Button>
      ) : null}
    </Stack>
  );
}
