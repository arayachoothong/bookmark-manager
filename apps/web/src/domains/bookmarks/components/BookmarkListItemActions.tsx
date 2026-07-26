import { Button, Stack } from "@bookmark-manager/ui";

type BookmarkListItemActionsProps = {
  bookmarkId: string;
  deleting?: boolean;
  removing?: boolean;
  showAssign?: boolean;
  onAssign?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRemove?: (id: string) => void;
};

export function BookmarkListItemActions({
  bookmarkId,
  deleting,
  removing,
  showAssign = true,
  onAssign,
  onDelete,
  onRemove,
}: BookmarkListItemActionsProps) {
  return (
    <Stack direction="row" className="items-center gap-2">
      {showAssign && onAssign ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onAssign(bookmarkId)}
        >
          Assign
        </Button>
      ) : null}
      {onRemove ? (
        <Button
          color="error"
          size="small"
          variant="outlined"
          disabled={removing}
          onClick={() => onRemove(bookmarkId)}
        >
          Remove
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          color="error"
          size="small"
          variant="outlined"
          disabled={deleting}
          onClick={() => onDelete(bookmarkId)}
        >
          Delete
        </Button>
      ) : null}
    </Stack>
  );
}
