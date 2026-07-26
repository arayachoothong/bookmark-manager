import { AlertToast, type AlertSeverity } from "@bookmark-manager/ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AlertState = {
  open: boolean;
  severity: AlertSeverity;
  message: string;
};

type AlertContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "success",
    message: "",
  });

  const showSuccess = useCallback((message: string) => {
    setAlert({ open: true, severity: "success", message });
  }, []);

  const showError = useCallback((message: string) => {
    setAlert({ open: true, severity: "error", message });
  }, []);

  const value = useMemo(
    () => ({ showSuccess, showError }),
    [showSuccess, showError],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertToast
        open={alert.open}
        severity={alert.severity}
        message={alert.message}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}
