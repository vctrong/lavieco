import "server-only";

import { ZodError, type z } from "zod";

import { isServiceProblem, ServiceUnavailableError } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { webLogger } from "@/lib/services";

import type { CheckoutError, CheckoutFailure, FieldErrors } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, CheckoutFailure>> = {
  "otp.code_invalid": "code_invalid",
  "otp.expired": "code_expired",
  "otp.attempts_exceeded": "attempts_exceeded",
  "otp.send_limited": "send_limited",
  "otp.verification_invalid": "verification_invalid",
  "order.sold_out": "sold_out",
  "order.items_invalid": "items_invalid",
  "order.answers_invalid": "answers_invalid",
  "order.consent_required": "consent_required",
  "order.registration_closed": "registration_closed",
  "order.email_mismatch": "email_mismatch",
  "order.invalid_state": "invalid_state",
  "payment.unavailable": "payment_unavailable",
};

/**
 * A service error as a failure the UI can explain. Anything unexpected is logged
 * without personal data and shown as "try again later", never as raw detail.
 */
export function toCheckoutError(error: unknown, context: string): CheckoutError {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) {
      const { retryAfterSeconds, remainingAttempts } = error.problem;
      return {
        status: "error",
        reason,
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
        ...(remainingAttempts !== undefined ? { remainingAttempts } : {}),
      };
    }
  }
  webLogger().warn("checkout step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
    ...(isServiceProblem(error) ? {} : failureKind(error)),
  });
  return { status: "error", reason: "unavailable" };
}

/**
 * Why a call failed, without the request path (it carries the signed order link) or
 * any response value: the kind of failure and, for a contract drift, the field paths.
 */
function failureKind(error: unknown): Record<string, unknown> {
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

/** First Zod message per top-level field (`buyer.email` → `email`), for inline errors. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path.at(-1) ?? issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { status: "invalid", fieldErrors };
}
