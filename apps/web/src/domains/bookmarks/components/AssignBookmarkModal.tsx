import { useMeControllerMe } from "@bookmark-manager/api-client";
import { Button, Dialog } from "@bookmark-manager/ui";
import { useEffect, useState } from "react";

import { AssignBookmarkFields } from "./AssignBookmarkFields";
import { useAuthToken } from "../../auth/hooks/useAuthToken";
import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useBookmarkAssignment } from "../hooks/useBookmarkAssignment";

type AssignBookmarkModalProps = {
  bookmarkId: string;
  currentCollectionIds?: string[];
  open: boolean;
  onClose: () => void;
};

export function AssignBookmarkModal({
  bookmarkId,
  currentCollectionIds,
  open,
  onClose,
}: AssignBookmarkModalProps) {
  const { isApiAuthReady } = useAuthToken();
  const { showSuccess, showError } = useAlert();
  const [collectionIds, setCollectionIds] = useState(
    currentCollectionIds ?? [],
  );

  const meQuery = useMeControllerMe({
    query: { enabled: isApiAuthReady && open, queryKey: ["/me"] },
  });

  const assignment = useBookmarkAssignment(bookmarkId, {
    onSuccess: () => {
      showSuccess("Bookmark updated.");
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      setCollectionIds(currentCollectionIds ?? []);
    }
  }, [open, currentCollectionIds]);

  function handleSave() {
    if (!bookmarkId) {
      return;
    }
    assignment.mutate(
      {
        id: bookmarkId,
        data: { collectionIds },
      },
      {
        onError: (error) => {
          showError(
            getHttpErrorMessage(error, "Could not update bookmark."),
          );
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign bookmark"
      actions={
        <>
          <Button
            variant="text"
            onClick={onClose}
            disabled={assignment.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={assignment.isPending || !bookmarkId}
          >
            Save
          </Button>
        </>
      }
    >
      <AssignBookmarkFields
        value={collectionIds}
        onChange={setCollectionIds}
        currentUserId={meQuery.data?.id}
        disabled={assignment.isPending}
      />
    </Dialog>
  );
}
