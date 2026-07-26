import {
  getBookmarksControllerListQueryKey,
  useBookmarksControllerList,
  useCollectionsControllerAddBookmarks,
} from "@bookmark-manager/api-client";
import { Button, Dialog, Stack, TextField } from "@bookmark-manager/ui";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useAlert } from "../../../lib/alerts/AlertProvider";
import { getHttpErrorMessage } from "../../../lib/helpers/http-error.helper";
import { useDebouncedValue } from "../../../lib/hooks/useDebouncedValue";
import { invalidateBookmarkCaches } from "../../bookmarks/helpers/bookmark-query.helper";

type AddExistingBookmarksModalProps = {
  collectionId: string;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
};

export function AddExistingBookmarksModal({
  collectionId,
  currentUserId,
  open,
  onClose,
}: AddExistingBookmarksModalProps) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search.trim());
  const listParams = debouncedSearch ? { q: debouncedSearch } : undefined;

  const bookmarksQuery = useBookmarksControllerList(listParams, {
    query: {
      enabled: open,
      queryKey: getBookmarksControllerListQueryKey(listParams),
    },
  });

  const availableBookmarks = useMemo(
    () =>
      (bookmarksQuery.data ?? []).filter(
        (bookmark) =>
          bookmark.ownerId === currentUserId &&
          !bookmark.collectionIds.includes(collectionId),
      ),
    [bookmarksQuery.data, collectionId, currentUserId],
  );

  const addMutation = useCollectionsControllerAddBookmarks({
    mutation: {
      onSuccess: () => {
        invalidateBookmarkCaches(queryClient, { collectionId });
        showSuccess("Bookmarks added to collection.");
        onClose();
      },
      onError: (error) => {
        showError(
          getHttpErrorMessage(error, "Could not add bookmarks to collection."),
        );
      },
    },
  });
  const resetAddMutation = addMutation.reset;

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIds([]);
      resetAddMutation();
    }
  }, [open, resetAddMutation]);

  function toggleBookmark(bookmarkId: string) {
    setSelectedIds((current) =>
      current.includes(bookmarkId)
        ? current.filter((id) => id !== bookmarkId)
        : [...current, bookmarkId],
    );
  }

  function handleAdd() {
    if (selectedIds.length === 0) {
      return;
    }
    addMutation.mutate({
      id: collectionId,
      data: { bookmarkIds: selectedIds },
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add existing bookmarks"
      actions={
        <>
          <Button
            variant="text"
            onClick={onClose}
            disabled={addMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={addMutation.isPending || selectedIds.length === 0}
          >
            Add selected
          </Button>
        </>
      }
    >
      <Stack className="gap-3 pt-1">
        <TextField
          label="Search bookmarks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={addMutation.isPending}
        />
        {bookmarksQuery.isError ? (
          <Typography color="error" variant="body2">
            {getHttpErrorMessage(
              bookmarksQuery.error,
              "Could not load bookmarks.",
            )}
          </Typography>
        ) : null}
        {!bookmarksQuery.isLoading &&
        !bookmarksQuery.isError &&
        availableBookmarks.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No bookmarks available to add.
          </Typography>
        ) : null}
        {availableBookmarks.map((bookmark) => (
          <FormControlLabel
            key={bookmark.id}
            control={
              <Checkbox
                checked={selectedIds.includes(bookmark.id)}
                onChange={() => toggleBookmark(bookmark.id)}
                disabled={addMutation.isPending}
              />
            }
            label={bookmark.title}
          />
        ))}
      </Stack>
    </Dialog>
  );
}
