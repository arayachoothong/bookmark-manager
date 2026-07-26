import { Button, Stack } from "@bookmark-manager/ui";

type BookmarkListItemActionsProps = {
  bookmarkId: string;
  deleting?: boolean;
  showAssign?: boolean;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
};

export function BookmarkListItemActions({
  bookmarkId,
  deleting,
  showAssign = true,
  onAssign,
  onDelete,
}: BookmarkListItemActionsProps) {
  return (
    <Stack direction="row" className="items-center gap-2">
      {showAssign ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onAssign(bookmarkId)}
        >
          Assign
        </Button>
      ) : null}
      <Button
        color="error"
        size="small"
        variant="outlined"
        disabled={deleting}
        onClick={() => onDelete(bookmarkId)}
      >
        Delete
      </Button>
    </Stack>
  );
}
