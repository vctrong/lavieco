import type { ErrorCode, ProblemDetails } from "@lavieco/shared";

/** The service answered with a Problem Details body (4xx/5xx with a known code). */
export class ServiceProblemError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(`${problem.status} ${problem.code}`);
    this.name = "ServiceProblemError";
    this.problem = problem;
  }

  get code(): ErrorCode {
    return this.problem.code;
  }

  get status(): number {
    return this.problem.status;
  }
}

/** The service could not be reached, timed out, or answered something unreadable. */
export class ServiceUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ServiceUnavailableError";
  }
}

export function isServiceProblem(error: unknown, code?: ErrorCode): error is ServiceProblemError {
  return error instanceof ServiceProblemError && (code === undefined || error.code === code);
}
