import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { Stack } from "./Stack";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <Stack
      direction="row"
      className={joinClasses("items-start justify-between gap-4", className)}
    >
      <Stack className="min-w-0 flex-1 gap-1">
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" className="shrink-0 items-center gap-2">
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
