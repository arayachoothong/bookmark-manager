import { DomainHttpStatus } from "./http-status.constant";

export class NotFoundError extends Error {
  readonly statusCode = DomainHttpStatus.NotFound;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
