import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject,
} from "@nestjs/common";
import type { Request, Response } from "express";

import type { Logger } from "@lavieco/observability";
import {
  ERROR_CATALOG,
  PROBLEM_CONTENT_TYPE,
  PROBLEM_TYPE_BASE,
  isDomainError,
  type ErrorCode,
  type FieldError,
  type ProblemDetails,
} from "@lavieco/shared";

import { LOGGER } from "../logging/logging.module";
import { currentRequestId } from "../request-context/request-context";
import { RequestValidationError } from "../validation/zod";

type Mapped = {
  code: ErrorCode;
  detail?: string;
  errors?: FieldError[];
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  reason?: string;
};

const HTTP_STATUS_CODES: Record<number, ErrorCode> = {
  400: "common.validation_failed",
  401: "common.unauthenticated",
  403: "common.forbidden",
  404: "common.not_found",
  409: "common.conflict",
  413: "common.validation_failed",
  429: "common.rate_limited",
};

/**
 * Turns every error into Problem Details (RFC 9457, docs/02 §6.1). Unknown errors
 * become a generic 500: internal messages and stacks never leave the service.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mapped = this.map(exception);
    const { status, title } = ERROR_CATALOG[mapped.code];

    if (status >= 500) {
      this.logger.error("unhandled error", {
        errorCode: mapped.code,
        error: exception,
        path: request.path,
        requestId: currentRequestId(),
      });
    }

    const body: ProblemDetails = {
      type: `${PROBLEM_TYPE_BASE}${mapped.code}`,
      title,
      status,
      code: mapped.code,
      ...(mapped.detail ? { detail: mapped.detail } : {}),
      instance: request.path,
      ...(currentRequestId() ? { traceId: currentRequestId() } : {}),
      ...(mapped.errors ? { errors: mapped.errors } : {}),
      ...(mapped.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: mapped.retryAfterSeconds }
        : {}),
      ...(mapped.remainingAttempts !== undefined
        ? { remainingAttempts: mapped.remainingAttempts }
        : {}),
      ...(mapped.reason !== undefined ? { reason: mapped.reason } : {}),
    };
    if (mapped.retryAfterSeconds !== undefined) {
      response.setHeader("retry-after", String(mapped.retryAfterSeconds));
    }
    response.status(status).type(PROBLEM_CONTENT_TYPE).send(JSON.stringify(body));
  }

  private map(exception: unknown): Mapped {
    if (isDomainError(exception)) {
      const retry = exception.extensions?.retryAfterSeconds;
      const remaining = exception.extensions?.remainingAttempts;
      const reason = exception.extensions?.reason;
      return {
        code: exception.code,
        detail: exception.detail,
        retryAfterSeconds: typeof retry === "number" ? Math.ceil(retry) : undefined,
        remainingAttempts: typeof remaining === "number" ? remaining : undefined,
        reason: typeof reason === "string" && /^[a-z_]{1,40}$/.test(reason) ? reason : undefined,
      };
    }
    if (exception instanceof RequestValidationError) {
      return { code: "common.validation_failed", errors: exception.errors };
    }
    if (exception instanceof HttpException) {
      return { code: HTTP_STATUS_CODES[exception.getStatus()] ?? "common.internal" };
    }
    return { code: "common.internal" };
  }
}
