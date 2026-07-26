import {
  AXIOS_INSTANCE,
  setAccessTokenGetter,
} from "@bookmark-manager/api-client";

export function configureApiClient(getToken: () => Promise<string>) {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  if (baseURL) {
    AXIOS_INSTANCE.defaults.baseURL = baseURL;
  }
  setAccessTokenGetter(getToken);
}
