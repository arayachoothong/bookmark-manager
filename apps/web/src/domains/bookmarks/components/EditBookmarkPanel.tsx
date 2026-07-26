import {
  useBookmarksControllerGetOne,
  useBookmarksControllerPatch,
  useBookmarksControllerRemove,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, Loading, NoData, PageHeader, Stack } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import {
  BookmarkForm,
  type BookmarkFormValues,
} from "./BookmarkForm";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { routeForQueryError } from "../../../lib/helpers/query-error-route.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { BookmarkAccessRole } from "../constants/bookmark-access.constant";
import { bookmarkAccessRole } from "../helpers/bookmark-access.helper";
import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";

export function EditBookmarkPanel() {
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

  const [values, setValues] = useState<BookmarkFormValues>({
    url: "",
    title: "",
    description: "",
    collectionIds: [],
  });
  const [hydrated, setHydrated] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!bookmarkQuery.data || hydrated) {
      return;
    }
    setValues({
      url: bookmarkQuery.data.url,
      title: bookmarkQuery.data.title,
      description: bookmarkQuery.data.description ?? "",
      collectionIds: bookmarkQuery.data.collectionIds,
    });
    setHydrated(true);
  }, [bookmarkQuery.data, hydrated]);

  const patchMutation = useBookmarksControllerPatch({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateBookmarkCaches(queryClient, {
          bookmarkId: id,
          collectionIds: [
            ...(bookmarkQuery.data?.collectionIds ?? []),
            ...(variables.data.collectionIds ?? []),
          ],
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

  const removeMutation = useBookmarksControllerRemove({
    mutation: {
      onSuccess: () => {
        invalidateBookmarkCaches(queryClient, {
          bookmarkId: id,
          collectionIds: bookmarkQuery.data?.collectionIds,
        });
        showSuccess("Bookmark deleted.");
        navigate("/bookmarks", { replace: true });
      },
      onError: (error) => {
        showError(getHttpErrorMessage(error, "Could not delete bookmark."));
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

  function handleSubmit() {
    const trimmedUrl = values.url.trim();
    const trimmedTitle = values.title.trim();
    if (!trimmedUrl || !trimmedTitle) {
      return;
    }
    const trimmedDescription = values.description.trim();
    patchMutation.mutate({
      id,
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        description: trimmedDescription ? trimmedDescription : null,
        collectionIds: values.collectionIds,
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

      <BookmarkForm
        values={values}
        onChange={(nextValues) => {
          setValues(nextValues);
          patchMutation.reset();
        }}
        onSubmit={handleSubmit}
        currentUserId={meQuery.data.id}
        submitLabel="Save bookmark"
        disabled={patchMutation.isPending || removeMutation.isPending}
        errorText={errorText}
      />
      <Stack direction="row">
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteOpen(true)}
          disabled={patchMutation.isPending || removeMutation.isPending}
        >
          Delete bookmark
        </Button>
      </Stack>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete bookmark?"
        message="This permanently deletes the bookmark. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate({ id })}
        onCancel={() => setDeleteOpen(false)}
      />
    </Stack>
  );
}
