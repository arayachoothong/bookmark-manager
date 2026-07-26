import { PageHeader, Stack } from "@bookmark-manager/ui";
import { Button, Typography } from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { CallbackPage } from "../domains/auth/pages/CallbackPage";
import { AppProviders } from "./providers/AppProviders";

function CollectionsPlaceholderPage() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } =
    useAuth0();

  return (
    <Stack className="mx-auto max-w-3xl p-6">
      <PageHeader title="Collections" />
      {isLoading ? (
        <Typography variant="body2">Loading session…</Typography>
      ) : isAuthenticated ? (
        <>
          <Typography className="mb-4" variant="body2">
            Signed in as {user?.email ?? user?.name ?? "user"}
          </Typography>
          <Button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log out
          </Button>
        </>
      ) : (
        <Button
          onClick={() =>
            loginWithRedirect({
              appState: { returnTo: "/collections" },
            })
          }
        >
          Log in
        </Button>
      )}
    </Stack>
  );
}

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
          <Route path="/collections" element={<CollectionsPlaceholderPage />} />
          <Route path="/bookmarks" element={<BookmarksPlaceholderPage />} />
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
