import {
  getBookmarksControllerListQueryKey,
  useBookmarksControllerCreate,
  type CollectionResponse,
} from "@bookmark-manager/api-client";
import { Button, Stack, TextField } from "@bookmark-manager/ui";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

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
  return "Could not create bookmark. Try again.";
}

type CreateBookmarkFormProps = {
  collections: CollectionResponse[];
  defaultCollectionId?: string;
};

export function CreateBookmarkForm({
  collections,
  defaultCollectionId,
}: CreateBookmarkFormProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? "");

  useEffect(() => {
    setCollectionId(defaultCollectionId ?? "");
  }, [defaultCollectionId]);

  const createMutation = useBookmarksControllerCreate({
    mutation: {
      onSuccess: () => {
        setUrl("");
        setTitle("");
        setNotes("");
        setCollectionId(defaultCollectionId ?? "");
        void queryClient.invalidateQueries({
          queryKey: getBookmarksControllerListQueryKey(),
        });
      },
    },
  });

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
    ? createErrorMessage(createMutation.error)
    : undefined;

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Stack className="gap-2">
        <TextField
          label="URL"
          size="small"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            createMutation.reset();
          }}
          error={Boolean(errorText)}
          helperText={errorText}
          disabled={createMutation.isPending}
          required
        />
        <TextField
          label="Title"
          size="small"
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
          size="small"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={createMutation.isPending}
          multiline
          minRows={2}
        />
        <FormControl size="small">
          <InputLabel id="create-bookmark-collection-label">
            Collection (optional)
          </InputLabel>
          <Select
            labelId="create-bookmark-collection-label"
            label="Collection (optional)"
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            disabled={createMutation.isPending}
          >
            <MenuItem value="">None</MenuItem>
            {collections.map((collection) => (
              <MenuItem key={collection.id} value={collection.id}>
                {collection.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Button
        type="submit"
        variant="contained"
        disabled={
          createMutation.isPending || !url.trim() || !title.trim()
        }
        className="self-start"
      >
        Create bookmark
      </Button>
    </form>
  );
}
