import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { ForbiddenError } from "./forbidden.error";
import { NotFoundError } from "./not-found.error";

@Catch(NotFoundError, ForbiddenError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundError | ForbiddenError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof ForbiddenError
        ? HttpStatus.FORBIDDEN
        : HttpStatus.NOT_FOUND;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error:
        status === HttpStatus.FORBIDDEN ? "Forbidden" : "Not Found",
    });
  }
}
