import { PageHeader, Stack } from "@bookmark-manager/ui";
import { Typography } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { CallbackPage } from "../domains/auth/pages/CallbackPage";
import { CollectionDetailPage } from "../domains/collections/pages/CollectionDetailPage";
import { CollectionsPage } from "../domains/collections/pages/CollectionsPage";
import { AppProviders } from "./providers/AppProviders";

function BookmarksPlaceholderPage() {
  return (
    <Stack className="mx-auto max-w-3xl p-6">
      <PageHeader title="Bookmarks" />
      <Typography variant="body2">Bookmarks will appear here.</Typography>
    </Stack>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/" element={<Navigate to="/collections" replace />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/bookmarks" element={<BookmarksPlaceholderPage />} />
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
