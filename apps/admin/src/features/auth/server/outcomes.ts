import "server-only";

import type { z } from "zod";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { adminLogger } from "@/lib/services";

import type { StaffAuthError, StaffAuthFailure, StaffFieldErrors } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, StaffAuthFailure>> = {
  "auth.invalid_credentials": "invalid_credentials",
  "auth.account_locked": "locked",
  "auth.mfa_code_invalid": "mfa_code_invalid",
  "auth.mfa_token_invalid": "mfa_expired",
  "invitation.invalid": "invitation_invalid",
  "invitation.totp_invalid": "totp_invalid",
  "password.too_weak": "password_weak",
};

export function toFailure(error: unknown, context: string): StaffAuthError {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) return { status: "error", reason };
  }
  adminLogger().warn("staff auth step failed", {
    context,
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return { status: "error", reason: "unavailable" };
}

export function toFieldErrors(error: z.ZodError): StaffFieldErrors {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { status: "invalid", fieldErrors };
}
