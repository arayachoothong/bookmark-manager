import { useSharesControllerCreate } from "@bookmark-manager/api-client";
import { Button, Stack, TextField } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";

import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

type ShareCollectionFormProps = {
  collectionId: string;
};

type ApiErrorBody = { message?: string };

function isHttpError(
  error: unknown,
): error is { response?: { status?: number; data?: ApiErrorBody } } {
  return typeof error === "object" && error !== null && "response" in error;
}

function shareErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    if (status === 404) {
      return message ?? "User not found";
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return "Could not share collection. Try again.";
}

export function ShareCollectionForm({ collectionId }: ShareCollectionFormProps) {
  const [email, setEmail] = useState("");
  const { invalidateShares } = useCollectionsQuery();

  const shareMutation = useSharesControllerCreate({
    mutation: {
      onSuccess: () => {
        setEmail("");
        void invalidateShares(collectionId);
      },
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }
    shareMutation.mutate({
      collectionId,
      data: { email: trimmed },
    });
  }

  const errorText = shareMutation.isError
    ? shareErrorMessage(shareMutation.error)
    : undefined;

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <Typography variant="subtitle2">Invite by email</Typography>
      <Stack direction="row" className="items-start gap-2">
        <TextField
          label="Grantee email"
          type="email"
          size="small"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            shareMutation.reset();
          }}
          error={Boolean(errorText)}
          helperText={errorText}
          disabled={shareMutation.isPending}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="contained"
          disabled={shareMutation.isPending || !email.trim()}
        >
          Share
        </Button>
      </Stack>
      {shareMutation.isSuccess ? (
        <Typography color="success.main" variant="body2">
          Share invite sent.
        </Typography>
      ) : null}
    </form>
  );
}
