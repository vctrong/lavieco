import "server-only";

import { ZodError } from "zod";

import { ServiceUnavailableError } from "@lavieco/api-clients";

/** Short reference shown to the visitor; the log carries the full request id. */
export const refOf = (requestId: string) => requestId.replace(/-/g, "").slice(0, 8).toUpperCase();

/**
 * Why a call failed, without the request path (it may carry a signed link) or any
 * response value: the kind of failure and, for a contract drift, the field paths.
 */
export function failureKind(error: unknown): Record<string, unknown> {
  if (!(error instanceof ServiceUnavailableError)) return { failure: "unexpected" };
  if (error.cause instanceof ZodError) {
    return {
      failure: "contract",
      paths: error.cause.issues.slice(0, 5).map((issue) => issue.path.join(".")),
    };
  }
  const status = /^unexpected status (\d+)$/.exec(error.message)?.[1];
  return status ? { failure: "status", status: Number(status) } : { failure: "unreachable" };
}

/**
 * Runs a server action body so that it never throws to the browser: an unexpected
 * error (a bug, a dropped connection) goes to `onError`, which logs it and returns
 * a referenced "unavailable".
 */
export async function guarded<T, E>(
  body: () => Promise<T>,
  onError: (error: unknown) => E,
): Promise<T | E> {
  try {
    return await body();
  } catch (error) {
    return onError(error);
  }
}
