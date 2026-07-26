import { PageHeader, Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

export function ForbiddenPage() {
  return (
    <Stack className="mx-auto max-w-4xl gap-4 px-6 py-8">
      <PageHeader title="403" subtitle="Forbidden" />
      <Typography variant="body2" color="text.secondary">
        You do not have permission to view this page.
      </Typography>
      <Link
        to="/collections"
        className="text-sm text-[var(--accent)] no-underline hover:underline"
      >
        Back to collections
      </Link>
    </Stack>
  );
}
