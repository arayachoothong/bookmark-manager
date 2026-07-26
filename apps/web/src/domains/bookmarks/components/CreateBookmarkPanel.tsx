import {
  useBookmarksControllerCreate,
  useMeControllerMe,
  type CollectionResponse,
} from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack, TextField } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import { AssignBookmarkFields } from "./AssignBookmarkFields";
import { features } from "../../../config/features.config";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";
import { useOwnedCollections } from "../hooks/useOwnedCollections";

function ownedCollectionPrefill(
  ownedCollections: CollectionResponse[],
  collectionId: string,
): string {
  if (!collectionId) {
    return "";
  }
  return ownedCollections.some((collection) => collection.id === collectionId)
    ? collectionId
    : "";
}

export function CreateBookmarkPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryCollectionId = searchParams.get("collectionId") ?? "";
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();

  const meQuery = useMeControllerMe({
    query: { enabled: isApiAuthReady, queryKey: ["/me"] },
  });
  const { ownedCollections, isLoading: ownedCollectionsLoading } =
    useOwnedCollections(meQuery.data?.id);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [collectionId, setCollectionId] = useState(() =>
    ownedCollectionPrefill(ownedCollections, queryCollectionId),
  );
  const [hydratedPrefill, setHydratedPrefill] = useState(
    () =>
      !queryCollectionId ||
      Boolean(ownedCollectionPrefill(ownedCollections, queryCollectionId)),
  );

  useEffect(() => {
    if (hydratedPrefill) {
      return;
    }
    if (ownedCollectionsLoading) {
      return;
    }
    const prefill = ownedCollectionPrefill(
      ownedCollections,
      queryCollectionId,
    );
    if (prefill && collectionId === "") {
      setCollectionId(prefill);
    }
    setHydratedPrefill(true);
  }, [
    hydratedPrefill,
    ownedCollectionsLoading,
    ownedCollections,
    queryCollectionId,
    collectionId,
  ]);

  const createMutation = useBookmarksControllerCreate({
    mutation: {
      onSuccess: (_bookmark, variables) => {
        invalidateBookmarkCaches(queryClient, {
          collectionId: variables.data.collectionId,
        });
        showSuccess("Bookmark created.");
        const assignedCollectionId = variables.data.collectionId;
        navigate(
          assignedCollectionId
            ? `/collections/${assignedCollectionId}`
            : "/bookmarks",
          { replace: true },
        );
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not create bookmark. Try again."),
        );
      },
    },
  });

  if (!features.createBookmark) {
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
    createMutation.mutate({
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        ...(collectionId ? { collectionId } : {}),
      },
    });
  }

  const errorText = createMutation.isError
    ? getHttpErrorMessage(
        createMutation.error,
        "Could not create bookmark. Try again.",
      )
    : undefined;

  return (
    <Stack className="gap-6">
      <PageHeader
        title="New bookmark"
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
            createMutation.reset();
          }}
          error={Boolean(errorText)}
          helperText={errorText}
          disabled={createMutation.isPending}
          required
          autoFocus
        />
        <TextField
          label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            createMutation.reset();
          }}
          disabled={createMutation.isPending}
          required
        />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={createMutation.isPending}
          multiline
          minRows={2}
        />
        <AssignBookmarkFields
          value={collectionId}
          onChange={setCollectionId}
          currentUserId={meQuery.data?.id}
          disabled={createMutation.isPending}
        />
        <Stack direction="row">
          <Button
            type="submit"
            variant="contained"
            disabled={
              createMutation.isPending || !url.trim() || !title.trim()
            }
          >
            Create bookmark
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
