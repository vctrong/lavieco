import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
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
  });
  return { status: "error", reason: "unavailable" };
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
