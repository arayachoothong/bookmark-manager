import {
  useBookmarksControllerCreate,
  useMeControllerMe,
  type CollectionResponse,
} from "@bookmark-manager/api-client";
import { PageHeader, Stack } from "@bookmark-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import {
  BookmarkForm,
  type BookmarkFormValues,
} from "./BookmarkForm";
import { features } from "../../../config/features.config";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { invalidateBookmarkCaches } from "../helpers/bookmark-query.helper";
import { useOwnedCollections } from "../hooks/useOwnedCollections";

function ownedCollectionPrefill(
  ownedCollections: CollectionResponse[],
  collectionId: string,
): string[] {
  if (!collectionId) {
    return [];
  }
  return ownedCollections.some((collection) => collection.id === collectionId)
    ? [collectionId]
    : [];
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

  const [values, setValues] = useState<BookmarkFormValues>(() => ({
    url: "",
    title: "",
    description: "",
    collectionIds: ownedCollectionPrefill(
      ownedCollections,
      queryCollectionId,
    ),
  }));
  const [hydratedPrefill, setHydratedPrefill] = useState(
    () => !queryCollectionId,
  );

  useEffect(() => {
    if (hydratedPrefill) {
      return;
    }
    if (!meQuery.data?.id) {
      return;
    }
    if (ownedCollectionsLoading) {
      return;
    }
    const prefill = ownedCollectionPrefill(
      ownedCollections,
      queryCollectionId,
    );
    if (prefill.length > 0 && values.collectionIds.length === 0) {
      setValues((current) => ({ ...current, collectionIds: prefill }));
    }
    setHydratedPrefill(true);
  }, [
    hydratedPrefill,
    meQuery.data?.id,
    ownedCollectionsLoading,
    ownedCollections,
    queryCollectionId,
    values.collectionIds.length,
  ]);

  const createMutation = useBookmarksControllerCreate({
    mutation: {
      onSuccess: (_bookmark, variables) => {
        invalidateBookmarkCaches(queryClient, {
          collectionIds: variables.data.collectionIds,
        });
        showSuccess("Bookmark created.");
        const assignedCollectionId = variables.data.collectionIds?.[0];
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

  function handleSubmit() {
    const trimmedUrl = values.url.trim();
    const trimmedTitle = values.title.trim();
    if (!trimmedUrl || !trimmedTitle) {
      return;
    }
    const trimmedDescription = values.description.trim();
    createMutation.mutate({
      data: {
        url: trimmedUrl,
        title: trimmedTitle,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        ...(values.collectionIds.length > 0
          ? { collectionIds: values.collectionIds }
          : {}),
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

      <BookmarkForm
        values={values}
        onChange={(nextValues) => {
          setValues(nextValues);
          createMutation.reset();
        }}
        onSubmit={handleSubmit}
        currentUserId={meQuery.data?.id}
        submitLabel="Create bookmark"
        disabled={createMutation.isPending}
        errorText={errorText}
      />
    </Stack>
  );
}
