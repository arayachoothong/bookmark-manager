import { Navigate } from "react-router";

import type { AppRouteConfig } from "./app-route.interface";
import { CallbackPage } from "../pages/auth/callback";
import { AssignBookmarkPage } from "../pages/bookmarks/[id]/assign";
import { EditBookmarkPage } from "../pages/bookmarks/[id]";
import { BookmarksPage } from "../pages/bookmarks";
import { CreateBookmarkPage } from "../pages/bookmarks/new";
import { CollectionDetailPage } from "../pages/collections/[id]";
import { CollectionsPage } from "../pages/collections";
import { CreateCollectionPage } from "../pages/collections/new";
import { ForbiddenPage } from "../pages/errors/403";
import { NotFoundPage } from "../pages/errors/404";

export const appRoutes: AppRouteConfig[] = [
  { path: "/", element: <Navigate to="/collections" replace />, requireAuth: false, layout: "guest" },
  { path: "/collections", element: <CollectionsPage />, requireAuth: true, layout: "app" },
  { path: "/collections/new", element: <CreateCollectionPage />, requireAuth: true, layout: "app" },
  { path: "/collections/:id", element: <CollectionDetailPage />, requireAuth: true, layout: "app" },
  { path: "/bookmarks", element: <BookmarksPage />, requireAuth: true, layout: "app" },
  { path: "/bookmarks/new", element: <CreateBookmarkPage />, requireAuth: true, layout: "app" },
  { path: "/bookmarks/:id", element: <EditBookmarkPage />, requireAuth: true, layout: "app" },
  { path: "/bookmarks/:id/assign", element: <AssignBookmarkPage />, requireAuth: true, layout: "app" },
  { path: "/callback", element: <CallbackPage />, requireAuth: false, layout: "guest" },
  { path: "/403", element: <ForbiddenPage />, requireAuth: false, layout: "guest" },
  { path: "/404", element: <NotFoundPage />, requireAuth: false, layout: "guest" },
  { path: "*", element: <NotFoundPage />, requireAuth: false, layout: "guest" },
];
