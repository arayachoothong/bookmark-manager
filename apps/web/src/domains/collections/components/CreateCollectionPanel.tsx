import { useCollectionsControllerCreate } from "@bookmark-manager/api-client";
import { Button, PageHeader, Stack, TextField } from "@bookmark-manager/ui";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { features } from "../../../config/features.config";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CreateCollectionPanel() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  const [name, setName] = useState("");
  const { invalidateCollectionsList } = useCollectionsQuery();

  const createMutation = useCollectionsControllerCreate({
    mutation: {
      onSuccess: (collection) => {
        void invalidateCollectionsList();
        showSuccess("Collection created.");
        navigate(`/collections/${collection.id}`, { replace: true });
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not create collection. Try again."),
        );
      },
    },
  });

  if (!features.createCollection) {
    return <Navigate to="/403" replace />;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate({ data: { name: trimmed } });
  }

  const errorText = createMutation.isError
    ? getHttpErrorMessage(
        createMutation.error,
        "Could not create collection. Try again.",
      )
    : undefined;

  return (
    <Stack className="gap-6">
      <PageHeader
        title="New collection"
        actions={
          <Link
            to="/collections"
            className="text-sm font-medium text-[var(--muted)] no-underline hover:text-[var(--ink)]"
          >
            Cancel
          </Link>
        }
      />

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            createMutation.reset();
          }}
          error={Boolean(errorText)}
          helperText={errorText}
          disabled={createMutation.isPending}
          autoFocus
        />
        <Stack direction="row">
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending || !name.trim()}
          >
            Create collection
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
