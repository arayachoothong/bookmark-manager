import { Navigate } from "react-router";

import type { AppRouteConfig } from "./app-route.interface";
import { CallbackPage } from "../pages/auth/callback";
import { BookmarkDetailPage } from "../pages/bookmarks/[id]";
import { BookmarksPage } from "../pages/bookmarks";
import { CollectionDetailPage } from "../pages/collections/[id]";
import { CollectionsPage } from "../pages/collections";

export const appRoutes: AppRouteConfig[] = [
  {
    path: "/",
    element: <Navigate to="/collections" replace />,
    requireAuth: false,
  },
  {
    path: "/collections",
    element: <CollectionsPage />,
    requireAuth: true,
  },
  {
    path: "/collections/:id",
    element: <CollectionDetailPage />,
    requireAuth: true,
  },
  {
    path: "/bookmarks",
    element: <BookmarksPage />,
    requireAuth: true,
  },
  {
    path: "/bookmarks/:id",
    element: <BookmarkDetailPage />,
    requireAuth: true,
  },
  {
    path: "/callback",
    element: <CallbackPage />,
    requireAuth: false,
  },
];
