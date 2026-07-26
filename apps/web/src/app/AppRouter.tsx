import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { CallbackPage } from "../domains/auth/pages/CallbackPage";
import { BookmarkDetailPage } from "../domains/bookmarks/pages/BookmarkDetailPage";
import { BookmarksPage } from "../domains/bookmarks/pages/BookmarksPage";
import { CollectionDetailPage } from "../domains/collections/pages/CollectionDetailPage";
import { CollectionsPage } from "../domains/collections/pages/CollectionsPage";
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
