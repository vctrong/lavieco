import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { webLogger } from "@/lib/services";

import type { AuthError, AuthFailure, FieldErrors } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, AuthFailure>> = {
  "auth.invalid_credentials": "invalid_credentials",
  "auth.account_locked": "locked",
  "otp.code_invalid": "code_invalid",
  "otp.expired": "code_expired",
  "otp.attempts_exceeded": "attempts_exceeded",
  "otp.send_limited": "send_limited",
  "otp.verification_invalid": "verification_invalid",
  "member.email_taken": "email_taken",
  "password.too_weak": "password_weak",
};

/**
 * Turns a service error into a failure the UI can explain. Anything unexpected is
 * logged (without personal data) and shown as "try again later", never as raw detail.
 */
export function toAuthError(error: unknown, context: string): AuthError {
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
  webLogger().warn("auth step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return { status: "error", reason: "unavailable" };
}

/** First Zod message per field, for inline errors. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { status: "invalid", fieldErrors };
}
