import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { Stack } from "./Stack";

export type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading…" }: LoadingProps) {
  return (
    <Stack direction="row" className="items-center gap-3 py-2">
      <CircularProgress size={20} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
