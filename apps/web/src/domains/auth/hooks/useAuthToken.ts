import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";

import { configureApiClient } from "../../../lib/http/configure-api-client";

const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

export function useAuthToken(): void {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    configureApiClient(async () => {
      if (!isAuthenticated) {
        return "";
      }
      return getAccessTokenSilently({
        authorizationParams: { audience },
      });
    });
  }, [getAccessTokenSilently, isAuthenticated, isLoading]);
}
