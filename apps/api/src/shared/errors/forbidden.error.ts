import { DomainHttpStatus } from "./http-status.constant";

export class ForbiddenError extends Error {
  readonly statusCode = DomainHttpStatus.Forbidden;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
