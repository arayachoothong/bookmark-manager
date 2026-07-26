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
