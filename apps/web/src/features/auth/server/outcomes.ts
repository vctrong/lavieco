import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { failureKind, guarded as guard, refOf } from "@/lib/action-errors";
import { webLogger } from "@/lib/services";

import { TEXT } from "../constants/text";
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
  "common.rate_limited": "rate_limited",
};

/** Steps whose call asks identity to email a code: a 503 there means "code not sent". */
const SENDS_CODE = new Set(["signup.request_code", "reset.request_code"]);

/** Form fields a service may name in `common.validation_failed`, with their message. */
function serviceFieldMessage(field: string): string | null {
  const v = TEXT.vi.validation;
  switch (field) {
    case "email":
      return v.email;
    case "password":
    case "newPassword":
      return v.password;
    case "displayName":
      return v.displayName;
    case "code":
      return v.code;
    default:
      return null;
  }
}

function validationErrors(errors: { path: string }[] | undefined): FieldErrors | null {
  const fieldErrors: Record<string, string> = {};
  for (const { path } of errors ?? []) {
    const field = path.split(".")[0] ?? "";
    const message = serviceFieldMessage(field);
    if (message && !fieldErrors[field]) fieldErrors[field] = message;
  }
  return Object.keys(fieldErrors).length > 0 ? { status: "invalid", fieldErrors } : null;
}

/**
 * Turns a service error into a failure the UI can explain. Anything unexpected is
 * logged with the request id (no personal data) and shown as "try again later" with a
 * short reference, never as raw detail.
 */
export function toAuthError(
  error: unknown,
  context: string,
  requestId?: string,
): AuthError | FieldErrors {
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
    if (error.code === "common.validation_failed") {
      return validationErrors(error.problem.errors) ?? { status: "error", reason: "invalid_input" };
    }
  }
  const codeNotSent =
    isServiceProblem(error) && error.code === "common.unavailable" && SENDS_CODE.has(context);
  webLogger().warn("auth step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
    ...(requestId ? { requestId } : {}),
    ...(isServiceProblem(error) ? {} : failureKind(error)),
  });
  return {
    status: "error",
    reason: codeNotSent ? "code_not_sent" : "unavailable",
    ...(requestId ? { ref: refOf(requestId) } : {}),
  };
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

/** Runs a server action body so that it never throws to the browser. */
export function guarded<T>(
  context: string,
  requestId: string,
  body: () => Promise<T>,
): Promise<T | AuthError | FieldErrors> {
  return guard(body, (error) => toAuthError(error, context, requestId));
}
