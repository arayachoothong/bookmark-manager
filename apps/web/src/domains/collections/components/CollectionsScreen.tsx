import {
  useCollectionsControllerList,
  useCollectionsControllerRemove,
  useMeControllerMe,
} from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack } from "@bookmark-manager/ui";
import { useAuth0 } from "@auth0/auth0-react";
import Typography from "@mui/material/Typography";

import { CollectionsList } from "./CollectionsList";
import { CreateCollectionForm } from "./CreateCollectionForm";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CollectionsScreen() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } =
    useAuth0();
  const { isApiAuthReady } = useAuthToken();
  const canFetchApi = isAuthenticated && isApiAuthReady;
  const { invalidateCollectionsList } = useCollectionsQuery();

  const meQuery = useMeControllerMe({
    query: { enabled: canFetchApi, queryKey: ["/me"] },
  });

  const collectionsQuery = useCollectionsControllerList({
    query: { enabled: canFetchApi, queryKey: ["/collections"] },
  });

  const removeMutation = useCollectionsControllerRemove({
    mutation: {
      onSuccess: () => {
        void invalidateCollectionsList();
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
      <Stack className="mx-auto max-w-3xl p-6 gap-4">
        <PageHeader title="Collections" />
        <Button
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: "/collections" },
            })
          }
        >
          Log in
        </Button>
      </Stack>
    );
  }

  return (
    <Stack className="mx-auto max-w-3xl gap-6 p-6">
      <PageHeader
        title="Collections"
        subtitle={user?.email ?? undefined}
        actions={
          <Button
            size="small"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
          >
            Log out
          </Button>
        }
      />

      <CreateCollectionForm />

      {collectionsQuery.isLoading ? (
        <Typography variant="body2">Loading collections…</Typography>
      ) : collectionsQuery.isError ? (
        <Typography color="error" variant="body2">
          Could not load collections.
        </Typography>
      ) : meQuery.isLoading ? (
        <Typography variant="body2">Loading account…</Typography>
      ) : meQuery.isError || !meQuery.data ? (
        <Typography color="error" variant="body2">
          Could not load account.
        </Typography>
      ) : (
        <CollectionsList
          collections={collectionsQuery.data ?? []}
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
