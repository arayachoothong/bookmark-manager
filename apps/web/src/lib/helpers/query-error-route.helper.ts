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
