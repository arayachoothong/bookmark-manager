import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { useAuthToken } from "../../domains/auth/hooks/useAuthToken";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565c0",
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ApiClientBootstrap({ children }: { children: ReactNode }) {
  useAuthToken();
  return children;
}

function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: "http://localhost:3000/callback",
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={(appState?: AppState) => {
        navigate(appState?.returnTo ?? "/collections", { replace: true });
      }}
    >
      <ApiClientBootstrap>{children}</ApiClientBootstrap>
    </Auth0Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Auth0ProviderWithNavigate>{children}</Auth0ProviderWithNavigate>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
