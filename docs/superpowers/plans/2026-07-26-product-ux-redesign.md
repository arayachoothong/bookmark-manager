# Product UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/web` around an `<App />` layout (Collections | Bookmarks + Create menu), page-based create/edit/assign flows, modal share/assign, dedicated `/403` + `/404` pages, shared Loading/NoData/alerts, and a clean-light visual system — without changing any API/Prisma/Auth0 contract.

**Architecture:** Config-driven router wraps authenticated routes in `<App />` (brand, nav, Create menu, logout, alert host). Screens are thin composers. Lists split into `*List` / `*ListItem` / `*ListItemActions` (one file = one responsibility). Pure helpers live in `helpers/*.helper.ts`. Shared `Loading`, `NoData`, and `useAlert` replace duplicated loading/empty/toast code. Resource access failures navigate to `/403` or `/404` (API privacy 404 for not-invited stays `/404`); unknown client routes use `/404`.

**Tech Stack:** React 19, react-router 8, MUI 9, Tailwind 4, TanStack Query 5, Orval `@bookmark-manager/api-client`, `@bookmark-manager/ui`.

## Global Constraints

- Scope is `apps/web` + shared `packages/ui` primitives only — **no** API / Prisma / Auth0-URL / product-feature changes.
- Reuse Orval hooks; never hand-roll DTOs or fetch calls.
- **Layout chrome is `<App />`** at `apps/web/src/app/App.tsx` — never name it AppShell.
- **One file = one responsibility.** Do not grow mega-screens or mega-list rows. Split list UIs into List / ListItem / ListItemActions. Forms, modals, and actions each own their own file.
- **Helpers:** `*.helper.ts` under domain `helpers/` or `src/lib/helpers/`. Enums stay in `constants/*.constant.ts` with **no** helper functions in those files.
- **Shared states:** always use `<Loading />` and `<NoData />` — never inline “Loading…” / “No X yet” Typography blocks.
- **Alerts:** mutation success and failure go through `useAlert()` (global toast). Form field errors may stay inline; do not invent per-screen success banners.
- **Access UX:** unauthenticated users on `requireAuth` routes → route-level `RequireAuth` redirects to Auth0 login. **Not invited / no access to a collection or bookmark → `/404`** (match API privacy 404 via `routeForQueryError`). API 403 / viewer on owner-only mutate routes (edit/assign) → `/403`. Unknown client routes (`*`) → `/404`. Do **not** duplicate login CTAs or “not found or no access” panels inside every screen.
- Home `/` → `/collections`; `/callback` stays `/callback`.
- Keep `src/pages/` thin; UI copy stays inline (no labels config).
- Visual = clean light: soft-gray canvas, white surfaces, charcoal ink, ONE teal accent `#0f766e`; Fraunces + Manrope; avoid purple/cream-terracotta/broadsheet/glow/emoji.
- **Testing note:** no web unit-test runner. Gate = `pnpm --filter @bookmark-manager/web build` + listed manual checks. Web build typechecks `@bookmark-manager/ui` via source export.

---

## File Structure

**New — packages/ui**

- `packages/ui/src/Dialog.tsx`
- `packages/ui/src/MenuButton.tsx`
- `packages/ui/src/Loading.tsx`
- `packages/ui/src/NoData.tsx`
- `packages/ui/src/AlertToast.tsx` — presentational snackbar (controlled by props)

**New — shared web**

- `apps/web/src/app/App.tsx` — layout chrome + `<Outlet />` + alert host
- `apps/web/src/app/RequireAuth.tsx` — redirects unauthenticated users to Auth0 login
- `apps/web/src/components/ConfirmDialog.tsx`
- `apps/web/src/lib/alerts/AlertProvider.tsx` — context + `useAlert()`
- `apps/web/src/lib/helpers/http-error.helper.ts` — extract API error message / status
- `apps/web/src/lib/helpers/query-error-route.helper.ts` — map query HTTP status → `/403` | `/404` | null
- `apps/web/src/pages/errors/403/index.tsx` — `ForbiddenPage`
- `apps/web/src/pages/errors/404/index.tsx` — `NotFoundPage`

**New — collections**

- `apps/web/src/domains/collections/helpers/collection-access.helper.ts` — `collectionAccessRole(...)` moved out of constant file
- `apps/web/src/domains/collections/components/CollectionListItem.tsx`
- `apps/web/src/domains/collections/components/CollectionListItemActions.tsx`
- `apps/web/src/domains/collections/components/ShareCollectionModal.tsx`
- `apps/web/src/domains/collections/components/CreateCollectionScreen.tsx`
- `apps/web/src/pages/collections/new/index.tsx`

**New — bookmarks**

- `apps/web/src/domains/bookmarks/helpers/bookmark-access.helper.ts`
- `apps/web/src/domains/bookmarks/components/BookmarkListItem.tsx`
- `apps/web/src/domains/bookmarks/components/BookmarkListItemActions.tsx`
- `apps/web/src/domains/bookmarks/components/AssignBookmarkFields.tsx`
- `apps/web/src/domains/bookmarks/components/AssignBookmarkModal.tsx`
- `apps/web/src/domains/bookmarks/components/CreateBookmarkScreen.tsx`
- `apps/web/src/domains/bookmarks/components/EditBookmarkScreen.tsx`
- `apps/web/src/domains/bookmarks/components/AssignBookmarkScreen.tsx`
- `apps/web/src/domains/bookmarks/hooks/useOwnedCollections.ts`
- `apps/web/src/domains/bookmarks/hooks/useBookmarkAssignment.ts`
- `apps/web/src/pages/bookmarks/new/index.tsx`
- `apps/web/src/pages/bookmarks/[id]/assign/index.tsx`

**Modified**

- `packages/ui/src/index.ts`
- `apps/web/index.html`, `apps/web/src/styles.css`, `apps/web/src/app/providers/AppProviders.tsx`
- `apps/web/src/config/app-route.interface.ts`, `routes.config.tsx`, `AppRouter.tsx`
- Collections/bookmarks list screens, interfaces, constants (enum-only after helper extract)
- `pages/bookmarks/[id]/index.tsx` → `EditBookmarkPage`

**Deleted**

- `CreateCollectionForm.tsx`, `CreateBookmarkForm.tsx`, `BookmarkDetailScreen.tsx`

---

### Task 1: UI primitives — Dialog, MenuButton, Loading, NoData, AlertToast

**Files:**
- Create: `packages/ui/src/Dialog.tsx`
- Create: `packages/ui/src/MenuButton.tsx`
- Create: `packages/ui/src/Loading.tsx`
- Create: `packages/ui/src/NoData.tsx`
- Create: `packages/ui/src/AlertToast.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Dialog({ open, onClose, title, children?, actions? })`
  - `MenuButton({ label, items: MenuButtonItem[], variant? })`
  - `Loading({ label?: string })`
  - `NoData({ message: string; action?: ReactNode })`
  - `AlertToast({ open, severity, message, onClose })` where `severity: "success" | "error"`

- [ ] **Step 1: Create Dialog**

```tsx
// packages/ui/src/Dialog.tsx
import MuiDialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import type { ReactNode } from "react";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
};

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  return (
    <MuiDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MuiDialog>
  );
}
```

- [ ] **Step 2: Create MenuButton**

```tsx
// packages/ui/src/MenuButton.tsx
import MuiButton from "@mui/material/Button";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import { useState, type ReactNode } from "react";

export type MenuButtonItem = {
  key: string;
  label: ReactNode;
  onSelect: () => void;
};

export type MenuButtonProps = {
  label: ReactNode;
  items: MenuButtonItem[];
  variant?: "text" | "outlined" | "contained";
};

export function MenuButton({ label, items, variant = "contained" }: MenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <MuiButton variant={variant} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {label}
      </MuiButton>
      <MuiMenu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {items.map((item) => (
          <MuiMenuItem
            key={item.key}
            onClick={() => {
              setAnchorEl(null);
              item.onSelect();
            }}
          >
            {item.label}
          </MuiMenuItem>
        ))}
      </MuiMenu>
    </>
  );
}
```

- [ ] **Step 3: Create Loading**

```tsx
// packages/ui/src/Loading.tsx
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { Stack } from "./Stack";

export type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading…" }: LoadingProps) {
  return (
    <Stack direction="row" className="items-center gap-3 py-2">
      <CircularProgress size={20} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
```

- [ ] **Step 4: Create NoData**

```tsx
// packages/ui/src/NoData.tsx
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { Stack } from "./Stack";

export type NoDataProps = {
  message: string;
  action?: ReactNode;
};

export function NoData({ message, action }: NoDataProps) {
  return (
    <Stack className="gap-3 py-2">
      <Typography color="text.secondary" variant="body2">
        {message}
      </Typography>
      {action ?? null}
    </Stack>
  );
}
```

- [ ] **Step 5: Create AlertToast**

```tsx
// packages/ui/src/AlertToast.tsx
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export type AlertSeverity = "success" | "error";

export type AlertToastProps = {
  open: boolean;
  severity: AlertSeverity;
  message: string;
  onClose: () => void;
};

export function AlertToast({ open, severity, message, onClose }: AlertToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <MuiAlert severity={severity} variant="filled" onClose={onClose}>
        {message}
      </MuiAlert>
    </Snackbar>
  );
}
```

- [ ] **Step 6: Export from packages/ui/src/index.ts**

Append:

```ts
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { MenuButton } from "./MenuButton";
export type { MenuButtonItem, MenuButtonProps } from "./MenuButton";
export { Loading } from "./Loading";
export type { LoadingProps } from "./Loading";
export { NoData } from "./NoData";
export type { NoDataProps } from "./NoData";
export { AlertToast } from "./AlertToast";
export type { AlertSeverity, AlertToastProps } from "./AlertToast";
```

- [ ] **Step 7: Verify build**

Run: `pnpm --filter @bookmark-manager/web build`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/Dialog.tsx packages/ui/src/MenuButton.tsx packages/ui/src/Loading.tsx packages/ui/src/NoData.tsx packages/ui/src/AlertToast.tsx packages/ui/src/index.ts
git commit -m "feat(ui): Dialog, MenuButton, Loading, NoData, AlertToast"
```

---

### Task 2: Visual system + AlertProvider + http helpers

**Files:**
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/app/providers/AppProviders.tsx`
- Create: `apps/web/src/lib/alerts/AlertProvider.tsx`
- Create: `apps/web/src/lib/helpers/http-error.helper.ts`
- Create: `apps/web/src/lib/helpers/query-error-route.helper.ts`

**Interfaces:**
- Produces:
  - CSS vars `--bg`, `--surface`, `--ink`, `--muted`, `--accent`
  - `useAlert(): { showSuccess(message: string): void; showError(message: string): void }`
  - `getHttpStatus(error: unknown): number | undefined`
  - `getHttpErrorMessage(error: unknown, fallback: string): string`
  - `routeForQueryError(error: unknown): "/403" | "/404" | null` — API 403 → `/403`, API 404 (incl. privacy not-invited) → `/404`

- [ ] **Step 1: Fonts in index.html**

After `<title>…</title>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Replace styles.css**

```css
@import "tailwindcss";

:root {
  color-scheme: light;
  --bg: #f4f5f7;
  --surface: #ffffff;
  --ink: #1f2933;
  --muted: #647084;
  --accent: #0f766e;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: "Manrope", system-ui, sans-serif;
}
```

- [ ] **Step 3: Theme in AppProviders**

Replace the `theme` constant with:

```tsx
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f766e" },
    background: { default: "#f4f5f7" },
    text: { primary: "#1f2933" },
  },
  typography: {
    fontFamily: '"Manrope", system-ui, sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif' },
    h2: { fontFamily: '"Fraunces", Georgia, serif' },
    h3: { fontFamily: '"Fraunces", Georgia, serif' },
    h4: { fontFamily: '"Fraunces", Georgia, serif' },
  },
});
```

Wrap children with `AlertProvider` (created next step) inside `QueryClientProvider`:

```tsx
import { AlertProvider } from "../../lib/alerts/AlertProvider";

// inside AppProviders return:
<ThemeProvider theme={theme}>
  <CssBaseline />
  <QueryClientProvider client={queryClient}>
    <AlertProvider>
      <Auth0ProviderWithNavigate>{children}</Auth0ProviderWithNavigate>
    </AlertProvider>
  </QueryClientProvider>
</ThemeProvider>
```

- [ ] **Step 4: Create AlertProvider**

```tsx
// apps/web/src/lib/alerts/AlertProvider.tsx
import { AlertToast, type AlertSeverity } from "@bookmark-manager/ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AlertState = {
  open: boolean;
  severity: AlertSeverity;
  message: string;
};

type AlertContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    severity: "success",
    message: "",
  });

  const showSuccess = useCallback((message: string) => {
    setAlert({ open: true, severity: "success", message });
  }, []);

  const showError = useCallback((message: string) => {
    setAlert({ open: true, severity: "error", message });
  }, []);

  const value = useMemo(
    () => ({ showSuccess, showError }),
    [showSuccess, showError],
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertToast
        open={alert.open}
        severity={alert.severity}
        message={alert.message}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}
```

- [ ] **Step 5: Create http-error.helper.ts**

```ts
// apps/web/src/lib/helpers/http-error.helper.ts
type ApiErrorBody = { message?: string };

function isHttpError(
  error: unknown,
): error is { response?: { status?: number; data?: ApiErrorBody } } {
  return typeof error === "object" && error !== null && "response" in error;
}

export function getHttpStatus(error: unknown): number | undefined {
  if (!isHttpError(error)) {
    return undefined;
  }
  return error.response?.status;
}

export function getHttpErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isHttpError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
```

- [ ] **Step 6: Create query-error-route.helper.ts**

```ts
// apps/web/src/lib/helpers/query-error-route.helper.ts
import { getHttpStatus } from "./http-error.helper";

export type ErrorRoute = "/403" | "/404";

/**
 * Map an API error to a dedicated error page.
 * Privacy not-invited responses are 404 from the API → UI /404.
 */
export function routeForQueryError(error: unknown): ErrorRoute | null {
  const status = getHttpStatus(error);
  if (status === 403) {
    return "/403";
  }
  if (status === 404) {
    return "/404";
  }
  return null;
}
```

- [ ] **Step 7: Verify build**

Run: `pnpm --filter @bookmark-manager/web build`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/index.html apps/web/src/styles.css apps/web/src/app/providers/AppProviders.tsx apps/web/src/lib/alerts/AlertProvider.tsx apps/web/src/lib/helpers/http-error.helper.ts apps/web/src/lib/helpers/query-error-route.helper.ts
git commit -m "feat(web): visual tokens, AlertProvider, http error helpers"
```

---

### Task 3: `<App />`, RequireAuth, 403/404 pages, routing

**Files:**
- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/app/RequireAuth.tsx`
- Create: `apps/web/src/components/ConfirmDialog.tsx`
- Create: `apps/web/src/pages/errors/403/index.tsx`
- Create: `apps/web/src/pages/errors/404/index.tsx`
- Create: page scaffolds + screen placeholders listed below
- Modify: `apps/web/src/config/app-route.interface.ts`
- Modify: `apps/web/src/config/routes.config.tsx`
- Modify: `apps/web/src/app/AppRouter.tsx`

**Interfaces:**
- Produces: `App()`, `RequireAuth({ children })`, `ConfirmDialog(...)`, `ForbiddenPage`, `NotFoundPage`, `AppRouteConfig.layout: "app" | "guest"`

- [ ] **Step 1: ConfirmDialog**

```tsx
// apps/web/src/components/ConfirmDialog.tsx
import { Button, Dialog } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <Button variant="text" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={destructive ? "error" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography variant="body2">{message}</Typography>
    </Dialog>
  );
}
```

- [ ] **Step 2: RequireAuth**

```tsx
// apps/web/src/app/RequireAuth.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { Loading } from "@bookmark-manager/ui";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void loginWithRedirect({
        appState: { returnTo: location.pathname + location.search },
      });
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, location.pathname, location.search]);

  if (isLoading || !isAuthenticated) {
    return <Loading label="Loading session…" />;
  }

  return children;
}
```

- [ ] **Step 3: App layout**

```tsx
// apps/web/src/app/App.tsx
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
```

- [ ] **Step 4: Error pages**

```tsx
// apps/web/src/pages/errors/403/index.tsx
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
```

```tsx
// apps/web/src/pages/errors/404/index.tsx
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
```

- [ ] **Step 5: Route interface**

```ts
// apps/web/src/config/app-route.interface.ts
import type { ReactNode } from "react";

export type AppRouteLayout = "app" | "guest";

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
  requireAuth: boolean;
  layout: AppRouteLayout;
}
```

- [ ] **Step 6: Page scaffolds + placeholder screens**

Create thin pages:

```tsx
// apps/web/src/pages/collections/new/index.tsx
import { CreateCollectionScreen } from "../../../domains/collections/components/CreateCollectionScreen";
export function CreateCollectionPage() {
  return <CreateCollectionScreen />;
}
```

```tsx
// apps/web/src/pages/bookmarks/new/index.tsx
import { CreateBookmarkScreen } from "../../../domains/bookmarks/components/CreateBookmarkScreen";
export function CreateBookmarkPage() {
  return <CreateBookmarkScreen />;
}
```

```tsx
// apps/web/src/pages/bookmarks/[id]/assign/index.tsx
import { AssignBookmarkScreen } from "../../../../domains/bookmarks/components/AssignBookmarkScreen";
export function AssignBookmarkPage() {
  return <AssignBookmarkScreen />;
}
```

```tsx
// apps/web/src/pages/bookmarks/[id]/index.tsx
import { EditBookmarkScreen } from "../../../domains/bookmarks/components/EditBookmarkScreen";
export function EditBookmarkPage() {
  return <EditBookmarkScreen />;
}
```

Placeholders (overwritten later):

```tsx
// each of CreateCollectionScreen / CreateBookmarkScreen / EditBookmarkScreen / AssignBookmarkScreen
export function CreateCollectionScreen() {
  return null;
}
```

(same pattern for the other three)

- [ ] **Step 7: routes.config.tsx**

```tsx
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
```

- [ ] **Step 8: AppRouter**

```tsx
// apps/web/src/app/AppRouter.tsx
import { BrowserRouter, Route, Routes } from "react-router";

import { appRoutes } from "../config/routes.config";
import { App } from "./App";
import { AppProviders } from "./providers/AppProviders";

export function AppRouter() {
  const appLayoutRoutes = appRoutes.filter((route) => route.layout === "app");
  const guestRoutes = appRoutes.filter((route) => route.layout === "guest");

  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<App />}>
            {appLayoutRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>
          {guestRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
```

- [ ] **Step 9: Verify build + manual**

Run: `pnpm --filter @bookmark-manager/web build` → PASS  
Manual: login shows `<App />` chrome; `/403` and `/404` render dedicated pages; unknown path hits catch-all 404.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/App.tsx apps/web/src/app/RequireAuth.tsx apps/web/src/app/AppRouter.tsx apps/web/src/components/ConfirmDialog.tsx apps/web/src/pages/errors apps/web/src/config apps/web/src/pages/collections/new apps/web/src/pages/bookmarks/new apps/web/src/pages/bookmarks/[id] apps/web/src/domains/collections/components/CreateCollectionScreen.tsx apps/web/src/domains/bookmarks/components/CreateBookmarkScreen.tsx apps/web/src/domains/bookmarks/components/EditBookmarkScreen.tsx apps/web/src/domains/bookmarks/components/AssignBookmarkScreen.tsx
git commit -m "feat(web): App layout, RequireAuth, 403/404 routes"
```

---

### Task 4: Access helpers (move functions out of constants)

**Files:**
- Create: `apps/web/src/domains/collections/helpers/collection-access.helper.ts`
- Create: `apps/web/src/domains/bookmarks/helpers/bookmark-access.helper.ts`
- Modify: both `*.constant.ts` files to **enum only**
- Update every import of `collectionAccessRole` / `bookmarkAccessRole` to the helper paths

- [ ] **Step 1: Collection helper + enum-only constant**

```ts
// apps/web/src/domains/collections/constants/collection-access.constant.ts
export enum CollectionAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}
```

```ts
// apps/web/src/domains/collections/helpers/collection-access.helper.ts
import { CollectionAccessRole } from "../constants/collection-access.constant";

export function collectionAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): CollectionAccessRole {
  return currentUserId === ownerId
    ? CollectionAccessRole.Owner
    : CollectionAccessRole.Viewer;
}
```

- [ ] **Step 2: Bookmark helper + enum-only constant**

```ts
// apps/web/src/domains/bookmarks/constants/bookmark-access.constant.ts
export enum BookmarkAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}
```

```ts
// apps/web/src/domains/bookmarks/helpers/bookmark-access.helper.ts
import { BookmarkAccessRole } from "../constants/bookmark-access.constant";

export function bookmarkAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): BookmarkAccessRole {
  return currentUserId === ownerId
    ? BookmarkAccessRole.Owner
    : BookmarkAccessRole.Viewer;
}
```

- [ ] **Step 3: Fix imports**

In every consumer that imported `collectionAccessRole` / `bookmarkAccessRole` from `../constants/...`, import the helper from `../helpers/...` and the enum from constants.

- [ ] **Step 4: Verify + commit**

```bash
pnpm --filter @bookmark-manager/web build
git add apps/web/src/domains/collections apps/web/src/domains/bookmarks
git commit -m "refactor(web): move access role helpers to *.helper.ts"
```

---

### Task 5: Collections list — Item + Actions + share modal + alerts

**Files:**
- Modify: `ShareCollectionForm.tsx` (use `getHttpErrorMessage` + `useAlert`; optional `onSuccess`)
- Create: `ShareCollectionModal.tsx`
- Create: `CollectionListItem.tsx`
- Create: `CollectionListItemActions.tsx`
- Modify: `collections-list.interface.ts`
- Modify: `CollectionsList.tsx` (map only)
- Modify: `CollectionsScreen.tsx` (compose Loading/NoData/modals; no login CTA)

**Interfaces:**
- `CollectionsListProps`: `{ collections; currentUserId?; deletingId?; onShare; onDelete }`
- `CollectionListItemProps`: `{ collection; currentUserId?; deletingId?; onShare; onDelete }`
- `CollectionListItemActionsProps`: `{ collectionId; deleting?; onShare; onDelete }`
- `ShareCollectionModal({ collectionId, open, onClose })`

- [ ] **Step 1: Update ShareCollectionForm**

Use `getHttpErrorMessage` from `lib/helpers/http-error.helper`. On success call `useAlert().showSuccess("Share invite sent.")` and `onSuccess?.()`. On failure after mutation error, also `showError(...)` in addition to field helperText (field stays for inline context).

Props:

```ts
type ShareCollectionFormProps = {
  collectionId: string;
  onSuccess?: () => void;
};
```

- [ ] **Step 2: ShareCollectionModal**

```tsx
import { Button, Dialog } from "@bookmark-manager/ui";
import { ShareCollectionForm } from "./ShareCollectionForm";

type ShareCollectionModalProps = {
  collectionId: string;
  open: boolean;
  onClose: () => void;
};

export function ShareCollectionModal({
  collectionId,
  open,
  onClose,
}: ShareCollectionModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share collection"
      actions={
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ShareCollectionForm collectionId={collectionId} onSuccess={onClose} />
    </Dialog>
  );
}
```

- [ ] **Step 3: Interfaces + Actions + Item + List**

```ts
// interfaces/collections-list.interface.ts
import type { CollectionResponse } from "@bookmark-manager/api-client";

export interface CollectionsListProps {
  collections: CollectionResponse[];
  currentUserId?: string;
  deletingId?: string;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}
```

```tsx
// CollectionListItemActions.tsx — owner actions only
import { Button, Stack } from "@bookmark-manager/ui";

type CollectionListItemActionsProps = {
  collectionId: string;
  deleting?: boolean;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionListItemActions({
  collectionId,
  deleting,
  onShare,
  onDelete,
}: CollectionListItemActionsProps) {
  return (
    <Stack direction="row" className="items-center gap-2">
      <Button size="small" variant="outlined" onClick={() => onShare(collectionId)}>
        Share
      </Button>
      <Button
        color="error"
        size="small"
        variant="outlined"
        disabled={deleting}
        onClick={() => onDelete(collectionId)}
      >
        Delete
      </Button>
    </Stack>
  );
}
```

```tsx
// CollectionListItem.tsx — single row presentation
import type { CollectionResponse } from "@bookmark-manager/api-client";
import { Stack } from "@bookmark-manager/ui";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";

import { CollectionListItemActions } from "./CollectionListItemActions";
import { CollectionAccessRole } from "../constants/collection-access.constant";
import { collectionAccessRole } from "../helpers/collection-access.helper";

type CollectionListItemProps = {
  collection: CollectionResponse;
  currentUserId?: string;
  deletingId?: string;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CollectionListItem({
  collection,
  currentUserId,
  deletingId,
  onShare,
  onDelete,
}: CollectionListItemProps) {
  const isOwner =
    collectionAccessRole(currentUserId, collection.ownerId) ===
    CollectionAccessRole.Owner;

  return (
    <li>
      <Stack
        direction="row"
        className="items-center justify-between gap-3 rounded-lg border border-gray-200 bg-[var(--surface)] px-4 py-3"
      >
        <Stack className="min-w-0 flex-1 gap-0.5">
          <Link
            to={`/collections/${collection.id}`}
            className="truncate font-medium text-[var(--ink)] no-underline hover:text-[var(--accent)]"
          >
            {collection.name}
          </Link>
          <Typography variant="caption" color="text.secondary">
            {isOwner ? "Owned by you" : "Shared with you (read-only)"}
          </Typography>
        </Stack>
        {isOwner ? (
          <CollectionListItemActions
            collectionId={collection.id}
            deleting={deletingId === collection.id}
            onShare={onShare}
            onDelete={onDelete}
          />
        ) : null}
      </Stack>
    </li>
  );
}
```

```tsx
// CollectionsList.tsx — map only
import { NoData } from "@bookmark-manager/ui";

import { CollectionListItem } from "./CollectionListItem";
import type { CollectionsListProps } from "../interfaces/collections-list.interface";

export function CollectionsList({
  collections,
  currentUserId,
  deletingId,
  onShare,
  onDelete,
}: CollectionsListProps) {
  if (collections.length === 0) {
    return (
      <NoData message="No collections yet. Use Create ▸ New collection to add one." />
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {collections.map((collection) => (
        <CollectionListItem
          key={collection.id}
          collection={collection}
          currentUserId={currentUserId}
          deletingId={deletingId}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: CollectionsScreen**

Auth is handled by `RequireAuth` inside `<App />` — **do not** render a login CTA here.

Pattern:

```tsx
export function CollectionsScreen() {
  // queries + removeMutation
  // on delete success: useAlert().showSuccess("Collection deleted.")
  // on delete error: useAlert().showError(getHttpErrorMessage(err, "Could not delete collection."))
  // loading: return <Loading label="Loading collections…" />
  // me / collections error that is not routeable: showError once + <NoData message="…" />
  // list + ShareCollectionModal + ConfirmDialog
}
```

Use `Loading` for pending queries. Never duplicate session-loading UI (App/RequireAuth owns that).

- [ ] **Step 5: Verify + manual + commit**

Build PASS. Manual: Share modal + alerts on success/fail; Delete confirm + alert; empty uses NoData; no inline login panel.

```bash
git add apps/web/src/domains/collections apps/web/src/components/ConfirmDialog.tsx
git commit -m "feat(web): collections list split into item/actions with share modal"
```

---

### Task 6: Create-collection page

**Files:**
- Overwrite: `CreateCollectionScreen.tsx`
- Delete: `CreateCollectionForm.tsx`

- [ ] **Step 1: Implement CreateCollectionScreen**

Page form only. On success: `showSuccess("Collection created.")` then `navigate(\`/collections/${collection.id}\`)`. On error: `showError(getHttpErrorMessage(...))` + field helperText. Gate with `features.createCollection` → if disabled, `<Navigate to="/403" replace />`.

Use `getHttpErrorMessage` — do not redefine `isHttpError` locally.

- [ ] **Step 2: `git rm` CreateCollectionForm.tsx**

- [ ] **Step 3: Build + manual + commit**

```bash
git commit -m "feat(web): create-collection page"
```

---

### Task 7: Collection detail — bookmarks list reuse + 404 for not-invited

**Files:**
- Modify: `CollectionDetailScreen.tsx`

- [ ] **Step 1: Reimplement**

Responsibilities of this screen only:
1. Load collection + its bookmarks (`useCollectionsControllerListBookmarks`)
2. If `collectionQuery.isError` → `const route = routeForQueryError(error) ?? "/404"; return <Navigate to={route} replace />`  
   (covers **not on invite list**: API privacy 404 → UI `/404`)
3. Header + owner “Add bookmark” link to `/bookmarks/new?collectionId=`
4. Render `BookmarksList` with `showAssign={false}` (assign stays on bookmarks list)
5. Delete bookmark via ConfirmDialog + alerts
6. Loading via `<Loading />`; empty via list’s `<NoData />`

Do **not** embed Share form or collection delete here (those live on the collections list).

> `BookmarksList` `showAssign` / `onAssign` land in Task 8. If build must stay green per commit, do Task 8’s BookmarksList contract first or land Tasks 7–8 before the shared build gate.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(web): collection detail lists bookmarks; not-invited opens 404"
```

---

### Task 8: Bookmarks list — Item + Actions + assign modal

**Files:**
- Create: `useOwnedCollections.ts`, `useBookmarkAssignment.ts`
- Create: `AssignBookmarkFields.tsx`, `AssignBookmarkModal.tsx`
- Create: `BookmarkListItem.tsx`, `BookmarkListItemActions.tsx`
- Modify: `bookmarks-list.interface.ts`, `BookmarksList.tsx`, `BookmarksScreen.tsx`

**Interfaces:**
- `BookmarksListProps`: `{ bookmarks; currentUserId?; deletingId?; showAssign?: boolean; onAssign; onDelete }`
- `BookmarkListItemActionsProps`: `{ bookmarkId; deleting?; showAssign; onAssign; onDelete }`
- `AssignBookmarkModal({ bookmarkId; currentCollectionId?; open; onClose })`

- [ ] **Step 1: Hooks**

`useOwnedCollections(currentUserId?)` filters `useCollectionsControllerList` to owned.

`useBookmarkAssignment(bookmarkId, { onSuccess? })` wraps `useBookmarksControllerPatch`, invalidates list + detail keys, calls `onSuccess`.

- [ ] **Step 2: AssignBookmarkFields + AssignBookmarkModal**

Modal Save uses patch with `collectionId: value || null`. Success: `showSuccess("Bookmark updated.")` + `onClose`. Error: `showError(getHttpErrorMessage(...))`.

- [ ] **Step 3: Split list**

Same pattern as collections:
- `BookmarkListItemActions` — Assign (if `showAssign`) + Delete
- `BookmarkListItem` — title link to `/bookmarks/:id`, url, caption, actions if owner
- `BookmarksList` — empty → `<NoData message="No bookmarks yet." />`; else map items

- [ ] **Step 4: BookmarksScreen**

No login CTA. `Loading` while fetching. Keep optional `CollectionFilter`. Header CTA link to `/bookmarks/new`. Wire assign modal + delete confirm + alerts on mutate outcomes.

- [ ] **Step 5: Build (covers Tasks 7–8) + manual + commit**

```bash
git commit -m "feat(web): bookmarks list item/actions + assign modal"
```

---

### Task 9: Create-bookmark page

**Files:**
- Overwrite: `CreateBookmarkScreen.tsx`
- Delete: `CreateBookmarkForm.tsx`

- [ ] **Step 1: Implement**

Fields: url, title, notes, owned-collection select. Prefill from `?collectionId=` when that id is in owned collections (compute initial value from `useOwnedCollections`; if collections load later and state is still empty, set once when owned list arrives — use a small `hydratedPrefill` flag, not duplicated form logic).

Success: `showSuccess` + navigate to `/collections/:id` when assigned else `/bookmarks`.  
Error: `showError` + field helperText via `getHttpErrorMessage`.  
Disabled feature → `<Navigate to="/403" replace />`.

- [ ] **Step 2: Remove CreateBookmarkForm.tsx**

- [ ] **Step 3: Build + commit**

```bash
git commit -m "feat(web): create-bookmark page with collection prefill"
```

---

### Task 10: Edit-bookmark page

**Files:**
- Overwrite: `EditBookmarkScreen.tsx`
- Delete: `BookmarkDetailScreen.tsx`

- [ ] **Step 1: Implement**

Load bookmark. On query error → `<Navigate to={routeForQueryError(error) ?? "/404"} replace />` (not invited / no access → `/404`).

If viewer (not owner): `<Navigate to="/403" replace />` — do **not** render a read-only edit form with disabled fields. Edit is an owner-only page; viewers browse from lists.

Owners: form for url/title/notes/collection. Save via patch + alerts + navigate `/bookmarks`.

Use `Loading` while fetching. Reuse `getHttpErrorMessage` — no local `isHttpError` copy.

- [ ] **Step 2: Delete BookmarkDetailScreen.tsx**

- [ ] **Step 3: Build + commit**

```bash
git commit -m "feat(web): edit-bookmark page; viewers redirect to 403"
```

---

### Task 11: Assign-bookmark page

**Files:**
- Overwrite: `AssignBookmarkScreen.tsx`

- [ ] **Step 1: Implement**

Load bookmark; access error → `/404` (or `/403` via `routeForQueryError`). Non-owner → `/403`.

Compose `AssignBookmarkFields` + Save using `useBookmarkAssignment`. Alerts on success/fail. Success navigates `/bookmarks`.

- [ ] **Step 2: Build + commit**

```bash
git commit -m "feat(web): assign-bookmark page"
```

---

### Task 12: Full-flow verification

- [ ] **Step 1:** `pnpm --filter @bookmark-manager/web build` → PASS
- [ ] **Step 2:** Confirm deleted files gone; no `AppShell` symbol remains (`rg AppShell apps/web` → no matches)
- [ ] **Step 3:** Confirm no duplicated local `isHttpError` in domains (`rg "function isHttpError" apps/web/src` → only in `http-error.helper.ts` if present at all)
- [ ] **Step 4:** Manual walkthrough:
  1. `<App />` nav + Create menu; `/callback` guest
  2. Create collection → alert → detail
  3. Share modal + success/error alerts; delete confirm + alert
  4. Collection detail bookmarks; add → prefilled create; delete; no Assign
  5. Bookmarks list Assign modal + edit page; viewer mutate routes → `/403`
  6. Open a collection URL you are **not invited to** (and do not own) → **`/404`** (match API privacy)
  7. Unknown client path → `/404` page
  8. Loading / NoData reused; clean-light visual
- [ ] **Step 5:** No commit (verification only)

---

## Self-review

1. **Spec coverage:** App rename, 403/404, item/action splits, helpers, alerts, Loading/NoData, no duplicate http-error helpers, RequireAuth — each has a task.
2. **Placeholders:** Task scaffolds use `return null` only as temporary build bridges overwritten by later tasks (called out explicitly).
3. **Type consistency:** `layout: "app" | "guest"`; `routeForQueryError` → `"/403" | "/404" | null` (privacy not-invited stays `/404`); list action props shared across collection detail (`showAssign={false}`) and bookmarks list.
