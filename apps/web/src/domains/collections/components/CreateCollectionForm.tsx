import { useCollectionsControllerCreate } from "@bookmark-manager/api-client";
import { Button, TextField } from "@bookmark-manager/ui";
import { useState, type FormEvent } from "react";

import { features } from "../../../config/features.config";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

type ApiErrorBody = { message?: string };

function isHttpError(
  error: unknown,
): error is { response?: { status?: number; data?: ApiErrorBody } } {
  return typeof error === "object" && error !== null && "response" in error;
}

function createErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Could not create collection. Try again.";
}

export function CreateCollectionForm() {
  if (!features.createCollection) {
    return null;
  }

  const [name, setName] = useState("");
  const { invalidateCollectionsList } = useCollectionsQuery();

  const createMutation = useCollectionsControllerCreate({
    mutation: {
      onSuccess: () => {
        setName("");
        void invalidateCollectionsList();
      },
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate({ data: { name: trimmed } });
  }

  const errorText = createMutation.isError
    ? createErrorMessage(createMutation.error)
    : undefined;

  return (
    <form
      className="flex flex-row items-start gap-2"
      onSubmit={handleSubmit}
    >
      <TextField
        label="New collection name"
        size="small"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          createMutation.reset();
        }}
        error={Boolean(errorText)}
        helperText={errorText}
        disabled={createMutation.isPending}
        className="min-w-0 flex-1"
      />
      <Button
        type="submit"
        variant="contained"
        disabled={createMutation.isPending || !name.trim()}
      >
        Create
      </Button>
    </form>
  );
}
