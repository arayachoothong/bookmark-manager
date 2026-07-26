import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { CallbackPage } from "../domains/auth/pages/CallbackPage";
import { BookmarkDetailPage } from "../pages/bookmarks/[id]";
import { BookmarksPage } from "../pages/bookmarks";
import { CollectionDetailPage } from "../pages/collections/[id]";
import { CollectionsPage } from "../pages/collections";
import { AppProviders } from "./providers/AppProviders";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/" element={<Navigate to="/collections" replace />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/bookmarks/:id" element={<BookmarkDetailPage />} />
          <Route path="/callback" element={<CallbackPage />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
