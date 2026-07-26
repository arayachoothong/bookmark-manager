import { useCollectionsControllerCreate } from "@bookmark-manager/api-client";
import { Button, TextField } from "@bookmark-manager/ui";
import { useState, type FormEvent } from "react";

import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

export function CreateCollectionForm() {
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

  return (
    <form
      className="flex flex-row items-start gap-2"
      onSubmit={handleSubmit}
    >
      <TextField
        label="New collection name"
        size="small"
        value={name}
        onChange={(event) => setName(event.target.value)}
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
