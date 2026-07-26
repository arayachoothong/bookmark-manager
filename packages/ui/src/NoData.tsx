import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { Stack } from "./Stack";

export type NoDataProps = {
  message: string;
  action?: ReactNode;
};

export function NoData({ message, action }: NoDataProps) {
  return (
    <Stack className="gap-3 py-2">
      <Typography color="text.secondary" variant="body2">
        {message}
      </Typography>
      {action ?? null}
    </Stack>
  );
}
