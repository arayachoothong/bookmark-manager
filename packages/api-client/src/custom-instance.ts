import axios, { type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = axios.create({
  baseURL: "",
});

/** Web app registers an auth token provider before queries run. */
let authTokenProvider: (() => Promise<string | undefined>) | undefined;

export function setAuthTokenProvider(
  provider: () => Promise<string | undefined>,
): void {
  authTokenProvider = provider;
}

export const customInstance = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const token = authTokenProvider ? await authTokenProvider() : undefined;
  const headers = {
    ...config.headers,
    ...options?.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await AXIOS_INSTANCE({
    ...config,
    ...options,
    headers,
  });
  return response.data as T;
};

export default customInstance;
