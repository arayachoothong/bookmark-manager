import { Button, Stack, TextField } from "@bookmark-manager/ui";
import type { FormEvent } from "react";

import { BookmarkCollectionsField } from "./BookmarkCollectionsField";

export type BookmarkFormValues = {
  url: string;
  title: string;
  notes: string;
  collectionIds: string[];
};

type BookmarkFormProps = {
  values: BookmarkFormValues;
  onChange: (values: BookmarkFormValues) => void;
  onSubmit: () => void;
  currentUserId?: string;
  submitLabel: string;
  disabled?: boolean;
  errorText?: string;
};

export function BookmarkForm({
  values,
  onChange,
  onSubmit,
  currentUserId,
  submitLabel,
  disabled,
  errorText,
}: BookmarkFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.title.trim() && values.url.trim()) {
      onSubmit();
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <TextField
        label="Title"
        value={values.title}
        onChange={(event) =>
          onChange({ ...values, title: event.target.value })
        }
        disabled={disabled}
        required
        autoFocus
      />
      <TextField
        label="URL"
        value={values.url}
        onChange={(event) => onChange({ ...values, url: event.target.value })}
        error={Boolean(errorText)}
        helperText={errorText}
        disabled={disabled}
        required
      />
      <TextField
        label="Description"
        value={values.notes}
        onChange={(event) =>
          onChange({ ...values, notes: event.target.value })
        }
        disabled={disabled}
        multiline
        minRows={2}
      />
      <BookmarkCollectionsField
        value={values.collectionIds}
        onChange={(collectionIds) => onChange({ ...values, collectionIds })}
        currentUserId={currentUserId}
        disabled={disabled}
      />
      <Stack direction="row">
        <Button
          type="submit"
          variant="contained"
          disabled={
            disabled || !values.url.trim() || !values.title.trim()
          }
        >
          {submitLabel}
        </Button>
      </Stack>
    </form>
  );
}
