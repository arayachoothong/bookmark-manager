export class NotFoundError extends Error {
  readonly statusCode = 404 as const;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
