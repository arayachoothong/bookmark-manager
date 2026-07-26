import { Button, Stack } from "@bookmark-manager/ui";

type CollectionListItemActionsProps = {
  collectionId: string;
  deleting?: boolean;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionListItemActions({
  collectionId,
  deleting,
  onShare,
  onDelete,
}: CollectionListItemActionsProps) {
  return (
    <Stack direction="row" className="items-center gap-2">
      <Button size="small" variant="outlined" onClick={() => onShare(collectionId)}>
        Share
      </Button>
      <Button
        color="error"
        size="small"
        variant="outlined"
        disabled={deleting}
        onClick={() => onDelete(collectionId)}
      >
        Delete
      </Button>
    </Stack>
  );
}
