import { useAuth0 } from "@auth0/auth0-react";
import { CircularProgress, Typography } from "@mui/material";
import { Stack } from "@bookmark-manager/ui";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export function CallbackPage() {
  const { error, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !error) {
      navigate("/collections", { replace: true });
    }
  }, [error, isAuthenticated, isLoading, navigate]);

  if (error) {
    return (
      <Stack className="min-h-screen items-center justify-center p-6">
        <Typography color="error" variant="body1">
          Login failed: {error.message}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack className="min-h-screen items-center justify-center gap-4">
      <CircularProgress size={32} />
      <Typography variant="body2">Completing sign-in…</Typography>
    </Stack>
  );
}
