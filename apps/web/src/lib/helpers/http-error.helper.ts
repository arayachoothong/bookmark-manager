type ApiErrorBody = { message?: string };

function isHttpError(
  error: unknown,
): error is { response?: { status?: number; data?: ApiErrorBody } } {
  return typeof error === "object" && error !== null && "response" in error;
}

export function getHttpStatus(error: unknown): number | undefined {
  if (!isHttpError(error)) {
    return undefined;
  }
  return error.response?.status;
}

export function getHttpErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (isHttpError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}
