import { useCollectionsControllerPatch } from "@bookmark-manager/api-client";
import { Button, Stack, TextField } from "@bookmark-manager/ui";
import { useEffect, useState, type FormEvent } from "react";

import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

type CollectionNameFormProps = {
  collectionId: string;
  initialName: string;
  onDelete: () => void;
};

export function CollectionNameForm({
  collectionId,
  initialName,
  onDelete,
}: CollectionNameFormProps) {
  const { showSuccess, showError } = useAlert();
  const { invalidateCollection, invalidateCollectionsList } =
    useCollectionsQuery();
  const [name, setName] = useState(initialName);

  useEffect(() => setName(initialName), [initialName]);

  const patchMutation = useCollectionsControllerPatch({
    mutation: {
      onSuccess: () => {
        void invalidateCollection(collectionId);
        void invalidateCollectionsList();
        showSuccess("Collection name saved.");
      },
      onError: (error) => {
        showError(getHttpErrorMessage(error, "Could not save collection name."));
      },
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    patchMutation.mutate({ id: collectionId, data: { name: trimmed } });
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <TextField
        label="Collection name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          patchMutation.reset();
        }}
        disabled={patchMutation.isPending}
        error={patchMutation.isError}
        helperText={
          patchMutation.isError
            ? getHttpErrorMessage(
                patchMutation.error,
                "Could not save collection name.",
              )
            : undefined
        }
      />
      <Stack direction="row" className="items-center gap-2">
        <Button
          type="submit"
          variant="contained"
          disabled={patchMutation.isPending || !name.trim()}
        >
          Save
        </Button>
        <Button
          type="button"
          color="error"
          variant="outlined"
          disabled={patchMutation.isPending}
          onClick={onDelete}
        >
          Delete
        </Button>
      </Stack>
    </form>
  );
}
