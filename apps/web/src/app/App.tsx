import { useAuth0 } from "@auth0/auth0-react";
import { MenuButton, Stack, type MenuButtonItem } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

import { features } from "../config/features.config";
import { RequireAuth } from "./RequireAuth";

function navLinkClass(active: boolean): string {
  return active
    ? "text-sm font-semibold text-[var(--accent)] no-underline"
    : "text-sm font-medium text-[var(--muted)] no-underline hover:text-[var(--ink)]";
}

function AppChrome() {
  const { user, logout } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  const isSection = (prefix: string) =>
    location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);

  const createItems: MenuButtonItem[] = [
    ...(features.createCollection
      ? [
          {
            key: "collection",
            label: "New collection",
            onSelect: () => navigate("/collections/new"),
          },
        ]
      : []),
    ...(features.createBookmark
      ? [
          {
            key: "bookmark",
            label: "New bookmark",
            onSelect: () => navigate("/bookmarks/new"),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-[var(--surface)]">
        <Stack
          direction="row"
          className="mx-auto max-w-4xl items-center justify-between gap-4 px-6 py-3"
        >
          <Stack direction="row" className="items-center gap-6">
            <Link
              to="/collections"
              className="font-[Fraunces] text-lg font-semibold text-[var(--ink)] no-underline"
            >
              Bookmark Manager
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/collections" className={navLinkClass(isSection("/collections"))}>
                Collections
              </Link>
              <Link to="/bookmarks" className={navLinkClass(isSection("/bookmarks"))}>
                Bookmarks
              </Link>
            </nav>
          </Stack>
          <Stack direction="row" className="items-center gap-3">
            {createItems.length > 0 ? (
              <MenuButton label="Create" items={createItems} />
            ) : null}
            {user?.email ? (
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            ) : null}
            <button
              type="button"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
            >
              Log out
            </button>
          </Stack>
        </Stack>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <RequireAuth>
      <AppChrome />
    </RequireAuth>
  );
}
