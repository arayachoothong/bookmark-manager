import { Button, Dialog } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <Button variant="text" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={destructive ? "error" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography variant="body2">{message}</Typography>
    </Dialog>
  );
}
