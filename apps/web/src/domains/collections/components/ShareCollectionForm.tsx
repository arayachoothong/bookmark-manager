import { useSharesControllerCreate } from "@bookmark-manager/api-client";
import { Button, Stack, TextField } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";

import { features } from "../../../config/features.config";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useCollectionsQuery } from "../hooks/useCollectionsQuery";

type ShareCollectionFormProps = {
  collectionId: string;
  onSuccess?: () => void;
};

export function ShareCollectionForm({
  collectionId,
  onSuccess,
}: ShareCollectionFormProps) {
  const { showSuccess, showError } = useAlert();
  const [email, setEmail] = useState("");
  const { invalidateShares } = useCollectionsQuery();

  const shareMutation = useSharesControllerCreate({
    mutation: {
      onSuccess: () => {
        setEmail("");
        void invalidateShares(collectionId);
        showSuccess("Share invite sent.");
        onSuccess?.();
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not share collection. Try again."),
        );
      },
    },
  });

  if (!features.shareCollection) {
    return null;
  }

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
    ? getHttpErrorMessage(
        shareMutation.error,
        "Could not share collection. Try again.",
      )
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
    </form>
  );
}
