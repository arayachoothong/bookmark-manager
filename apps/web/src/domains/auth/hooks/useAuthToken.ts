import { useAuth0 } from "@auth0/auth0-react";
import { useLayoutEffect } from "react";

import { configureApiClient } from "../../../lib/http/configure-api-client";

const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

export function useAuthToken(): { isApiAuthReady: boolean } {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

  useLayoutEffect(() => {
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

  return { isApiAuthReady: !isLoading };
}
