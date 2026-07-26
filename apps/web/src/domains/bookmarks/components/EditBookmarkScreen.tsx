import {
  useBookmarksControllerGetOne,
  useBookmarksControllerPatch,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, Loading, NoData, PageHeader, Stack, TextField } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { AssignBookmarkFields } from "./AssignBookmarkFields";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { routeForQueryError } from "../../../lib/helpers/query-error-route.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { BookmarkAccessRole } from "../constants/bookmark-access.constant";
import { bookmarkAccessRole } from "../helpers/bookmark-access.helper";
import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";

export function EditBookmarkScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const canFetchApi = isApiAuthReady && Boolean(id);

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

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!bookmarkQuery.data || hydrated) {
      return;
    }
    setUrl(bookmarkQuery.data.url);
    setTitle(bookmarkQuery.data.title);
    setNotes(bookmarkQuery.data.notes ?? "");
    setCollectionId(bookmarkQuery.data.collectionId ?? "");
    setHydrated(true);
  }, [bookmarkQuery.data, hydrated]);

  const patchMutation = useBookmarksControllerPatch({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateBookmarkCaches(queryClient, {
          bookmarkId: id,
          collectionId: variables.data.collectionId,
        });
        showSuccess("Bookmark updated.");
        navigate("/bookmarks", { replace: true });
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not update bookmark. Try again."),
        );
      },
    },
  });

  if (!id) {
    return <Navigate to="/404" replace />;
  }

  if (bookmarkQuery.isError) {
    const route = routeForQueryError(bookmarkQuery.error) ?? "/404";
    return <Navigate to={route} replace />;
  }

  if (
    !isApiAuthReady ||
    bookmarkQuery.isLoading ||
    meQuery.isLoading ||
    !hydrated
  ) {
    return <Loading label="Loading bookmark…" />;
  }

  if (meQuery.isError || !meQuery.data || !bookmarkQuery.data) {
    return <NoData message="Could not load bookmark." />;
  }

  const bookmark = bookmarkQuery.data;
  const role = bookmarkAccessRole(meQuery.data.id, bookmark.ownerId);
  if (role !== BookmarkAccessRole.Owner) {
    return <Navigate to="/403" replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    if (!trimmedUrl || !trimmedTitle) {
      return;
    }
    const trimmedNotes = notes.trim();
    patchMutation.mutate({
      id,
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        notes: trimmedNotes ? trimmedNotes : null,
        collectionId: collectionId ? collectionId : null,
      },
    });
  }

  const errorText = patchMutation.isError
    ? getHttpErrorMessage(
        patchMutation.error,
        "Could not update bookmark. Try again.",
      )
    : undefined;

  return (
    <Stack className="gap-6">
      <PageHeader
        title="Edit bookmark"
        actions={
          <Link
            to="/bookmarks"
            className="text-sm font-medium text-[var(--muted)] no-underline hover:text-[var(--ink)]"
          >
            Cancel
          </Link>
        }
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="URL"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            patchMutation.reset();
          }}
          error={Boolean(errorText)}
          helperText={errorText}
          disabled={patchMutation.isPending}
          required
          autoFocus
        />
        <TextField
          label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            patchMutation.reset();
          }}
          disabled={patchMutation.isPending}
          required
        />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={patchMutation.isPending}
          multiline
          minRows={2}
        />
        <AssignBookmarkFields
          value={collectionId}
          onChange={setCollectionId}
          currentUserId={meQuery.data.id}
          disabled={patchMutation.isPending}
        />
        <Stack direction="row">
          <Button
            type="submit"
            variant="contained"
            disabled={
              patchMutation.isPending || !url.trim() || !title.trim()
            }
          >
            Save bookmark
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
