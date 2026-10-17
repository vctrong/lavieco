import { ERROR_CATALOG, type ErrorCode } from "./error-catalog";

/**
 * A business error with a code from the catalog. Thrown from `domain`/`application`
 * and turned into Problem Details by the service-kit filter (S6). `detail` must
 * never contain personal data: it ends up in responses and logs.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly detail: string | undefined;
  readonly extensions: Readonly<Record<string, unknown>> | undefined;

  constructor(code: ErrorCode, detail?: string, extensions?: Record<string, unknown>) {
    super(`${code}${detail ? `: ${detail}` : ""}`);
    this.name = "DomainError";
    this.code = code;
    this.status = ERROR_CATALOG[code].status;
    this.detail = detail;
    this.extensions = extensions;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
