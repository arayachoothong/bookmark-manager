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
