import { Button, Dialog } from "@bookmark-manager/ui";

import { ShareCollectionForm } from "./ShareCollectionForm";

type ShareCollectionModalProps = {
  collectionId: string;
  open: boolean;
  onClose: () => void;
};

export function ShareCollectionModal({
  collectionId,
  open,
  onClose,
}: ShareCollectionModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share collection"
      actions={
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ShareCollectionForm collectionId={collectionId} onSuccess={onClose} />
    </Dialog>
  );
}
