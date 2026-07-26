import { PageHeader, Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <Stack className="mx-auto max-w-4xl gap-4 px-6 py-8">
      <PageHeader title="404" subtitle="Not found" />
      <Typography variant="body2" color="text.secondary">
        This page or resource does not exist, or you do not have access.
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
