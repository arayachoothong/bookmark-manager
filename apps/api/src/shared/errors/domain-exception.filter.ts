import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch } from "@nestjs/common";
import type { Response } from "express";
import { DomainHttpStatus } from "./http-status.constant";
import { ForbiddenError } from "./forbidden.error";
import { NotFoundError } from "./not-found.error";

@Catch(NotFoundError, ForbiddenError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundError | ForbiddenError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.statusCode;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error:
        status === DomainHttpStatus.Forbidden ? "Forbidden" : "Not Found",
    });
  }
}
