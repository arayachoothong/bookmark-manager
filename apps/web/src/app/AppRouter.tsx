import { BrowserRouter, Route, Routes } from "react-router";

import { appRoutes } from "../config/routes.config";
import { AppProviders } from "./providers/AppProviders";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          {appRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
