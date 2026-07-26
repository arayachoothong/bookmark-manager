import {
  useCollectionsControllerList,
  useCollectionsControllerRemove,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Loading, NoData, PageHeader, Stack } from "@bookmark-manager/ui";
import { useEffect, useState } from "react";

import { CollectionsList } from "./CollectionsList";
import { ShareCollectionModal } from "./ShareCollectionModal";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CollectionsPanel() {
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const { invalidateCollectionsList } = useCollectionsQuery();
  const [shareCollectionId, setShareCollectionId] = useState<string | null>(
    null,
  );
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(
    null,
  );

  const meQuery = useMeControllerMe({
    query: { enabled: isApiAuthReady, queryKey: ["/me"] },
  });

  const collectionsQuery = useCollectionsControllerList({
    query: { enabled: isApiAuthReady, queryKey: ["/collections"] },
  });

  const removeMutation = useCollectionsControllerRemove({
    mutation: {
      onSuccess: () => {
        void invalidateCollectionsList();
        showSuccess("Collection deleted.");
        setDeleteCollectionId(null);
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not delete collection."),
        );
      },
    },
  });

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

  useEffect(() => {
    if (meQuery.isError) {
      showError(getHttpErrorMessage(meQuery.error, "Could not load account."));
    }
  }, [meQuery.isError, meQuery.error, showError]);

  if (!isApiAuthReady || collectionsQuery.isLoading || meQuery.isLoading) {
    return <Loading label="Loading collections…" />;
  }

  if (collectionsQuery.isError || meQuery.isError || !meQuery.data) {
    return <NoData message="Could not load collections." />;
  }

  return (
    <Stack className="gap-6">
      <PageHeader title="Collections" />

      <CollectionsList
        collections={collectionsQuery.data ?? []}
        currentUserId={meQuery.data.id}
        deletingId={
          removeMutation.isPending ? removeMutation.variables?.id : undefined
        }
        onShare={(id) => setShareCollectionId(id)}
        onDelete={(id) => setDeleteCollectionId(id)}
      />

      <ShareCollectionModal
        collectionId={shareCollectionId ?? ""}
        open={shareCollectionId !== null}
        onClose={() => setShareCollectionId(null)}
      />

      <ConfirmDialog
        open={deleteCollectionId !== null}
        title="Delete collection?"
        message="This permanently deletes the collection and its bookmarks. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteCollectionId) {
            removeMutation.mutate({ id: deleteCollectionId });
          }
        }}
        onCancel={() => setDeleteCollectionId(null)}
      />
    </Stack>
  );
}
