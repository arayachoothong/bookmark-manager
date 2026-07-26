import {
  useCollectionsControllerGetOne,
  useCollectionsControllerRemove,
  useMeControllerMe,
  useSharesControllerList,
} from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack } from "@bookmark-manager/ui";
import { useAuth0 } from "@auth0/auth0-react";
import Typography from "@mui/material/Typography";
import { Link, useNavigate, useParams } from "react-router";

import { ShareCollectionForm } from "./ShareCollectionForm";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import {
  CollectionAccessRole,
  collectionAccessRole,
} from "../constants/collection-access.constant";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CollectionDetailScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { isApiAuthReady } = useAuthToken();
  const canFetchApi = isAuthenticated && isApiAuthReady && Boolean(id);
  const { invalidateCollectionsList } = useCollectionsQuery();

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

  const sharesQuery = useSharesControllerList(id, {
    query: {
      enabled:
        canFetchApi &&
        meQuery.data?.id === collectionQuery.data?.ownerId,
      queryKey: [`/collections/${id}/shares`],
    },
  });

  const removeMutation = useCollectionsControllerRemove({
    mutation: {
      onSuccess: () => {
        void invalidateCollectionsList();
        navigate("/collections", { replace: true });
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
        <PageHeader title="Collection" />
        <Button
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: `/collections/${id}` },
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
        <Typography variant="body2">Missing collection id.</Typography>
      </Stack>
    );
  }

  if (collectionQuery.isLoading) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading collection…</Typography>
      </Stack>
    );
  }

  if (collectionQuery.isError) {
    return (
      <Stack className="mx-auto max-w-3xl gap-4 p-6">
        <PageHeader title="Collection" />
        <Typography color="error" variant="body2">
          Collection not found or you do not have access.
        </Typography>
        <Link to="/collections" className="text-sm text-blue-800 no-underline hover:underline">
          Back to collections
        </Link>
      </Stack>
    );
  }

  const collection = collectionQuery.data;
  if (!collection) {
    return (
      <Stack className="mx-auto max-w-3xl p-6">
        <Typography variant="body2">Loading collection…</Typography>
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
        <PageHeader title={collection.name} />
        <Typography color="error" variant="body2">
          Could not load account.
        </Typography>
        <Link to="/collections" className="text-sm text-blue-800 no-underline hover:underline">
          Back to collections
        </Link>
      </Stack>
    );
  }

  const role = collectionAccessRole(meQuery.data.id, collection.ownerId);
  const isOwner = role === CollectionAccessRole.Owner;

  return (
    <Stack className="mx-auto max-w-3xl gap-6 p-6">
      <PageHeader
        title={collection.name}
        subtitle={
          isOwner ? "You own this collection" : "Shared with you (read-only)"
        }
        actions={
          <Link
            to="/collections"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm no-underline hover:bg-gray-50"
          >
            Back
          </Link>
        }
      />

      <Typography variant="body2" color="text.secondary">
        Updated {new Date(collection.updatedAt).toLocaleString()}
      </Typography>

      {isOwner ? (
        <>
          <ShareCollectionForm collectionId={collection.id} />

          <Stack className="gap-2">
            <Typography variant="subtitle2">People with access</Typography>
            {sharesQuery.isLoading ? (
              <Typography variant="body2">Loading shares…</Typography>
            ) : sharesQuery.isError ? (
              <Typography color="error" variant="body2">
                Could not load shares.
              </Typography>
            ) : sharesQuery.data && sharesQuery.data.length > 0 ? (
              <ul className="list-none p-0">
                {sharesQuery.data.map((share) => (
                  <Typography key={share.granteeUserId} component="li" variant="body2">
                    {share.email}
                  </Typography>
                ))}
              </ul>
            ) : (
              <Typography color="text.secondary" variant="body2">
                Not shared with anyone yet.
              </Typography>
            )}
          </Stack>

          <Button
            color="error"
            variant="outlined"
            disabled={removeMutation.isPending}
            onClick={() => removeMutation.mutate({ id: collection.id })}
          >
            Delete collection
          </Button>
        </>
      ) : null}
    </Stack>
  );
}
