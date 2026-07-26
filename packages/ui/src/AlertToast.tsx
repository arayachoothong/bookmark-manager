import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export type AlertSeverity = "success" | "error";

export type AlertToastProps = {
  open: boolean;
  severity: AlertSeverity;
  message: string;
  onClose: () => void;
};

export function AlertToast({ open, severity, message, onClose }: AlertToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <MuiAlert severity={severity} variant="filled" onClose={onClose}>
        {message}
      </MuiAlert>
    </Snackbar>
  );
}
