export class ForbiddenError extends Error {
  readonly statusCode = 403 as const;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
