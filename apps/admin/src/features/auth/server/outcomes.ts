import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { failureKind, guarded as guard, refOf } from "@/lib/action-errors";
import { adminLogger } from "@/lib/services";

import { TEXT } from "../constants/text";
import type { StaffAuthError, StaffAuthFailure, StaffFieldErrors } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, StaffAuthFailure>> = {
  "auth.invalid_credentials": "invalid_credentials",
  "auth.account_locked": "locked",
  "auth.mfa_code_invalid": "mfa_code_invalid",
  "auth.mfa_token_invalid": "mfa_expired",
  "invitation.invalid": "invitation_invalid",
  "invitation.totp_invalid": "totp_invalid",
  "password.too_weak": "password_weak",
  "common.rate_limited": "rate_limited",
};

/** Form fields a service may name in `common.validation_failed`, with their message. */
const FIELD_MESSAGES: Record<string, string> = {
  email: TEXT.vi.validation.email,
  password: TEXT.vi.validation.newPassword,
  displayName: TEXT.vi.validation.displayName,
  code: TEXT.vi.validation.code,
  totpCode: TEXT.vi.validation.totpCode,
};

/**
 * A service error as a failure the form can explain. Anything unexpected is logged
 * with the request id (no personal data) and shown as "try again later" with a short
 * reference.
 */
export function toFailure(
  error: unknown,
  context: string,
  requestId?: string,
): StaffAuthError | StaffFieldErrors {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) {
      const { retryAfterSeconds } = error.problem;
      return {
        status: "error",
        reason,
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      };
    }
    if (error.code === "common.validation_failed") {
      const fieldErrors: Record<string, string> = {};
      for (const { path } of error.problem.errors ?? []) {
        const field = path.split(".")[0] ?? "";
        const message = FIELD_MESSAGES[field];
        if (message && !fieldErrors[field]) fieldErrors[field] = message;
      }
      return Object.keys(fieldErrors).length > 0
        ? { status: "invalid", fieldErrors }
        : { status: "error", reason: "invalid_input" };
    }
  }
  adminLogger().warn("staff auth step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
    ...(requestId ? { requestId } : {}),
    ...(isServiceProblem(error) ? {} : failureKind(error)),
  });
  return {
    status: "error",
    reason: "unavailable",
    ...(requestId ? { ref: refOf(requestId) } : {}),
  };
}

export function toFieldErrors(error: z.ZodError): StaffFieldErrors {
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
): Promise<T | StaffAuthError | StaffFieldErrors> {
  return guard(body, (error) => toFailure(error, context, requestId));
}
