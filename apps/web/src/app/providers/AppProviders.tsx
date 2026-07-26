import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { useAuthToken } from "../../domains/auth/hooks/useAuthToken";
import { AlertProvider } from "../../lib/alerts/AlertProvider";

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
        <AlertProvider>
          <Auth0ProviderWithNavigate>{children}</Auth0ProviderWithNavigate>
        </AlertProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
