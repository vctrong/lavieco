import type { z } from "zod";

import { commonFailureMessage, type FormFailure } from "@/shared/form-failures";

import { TEXT } from "../constants/text";
import type { StaffAuthError } from "../types";

/** Vietnamese message for a failed staff auth step. */
export function failureOf(error: StaffAuthError): FormFailure {
  const e = TEXT.vi.errors;
  switch (error.reason) {
    case "unavailable":
    case "stale_version":
    case "offline":
    case "bot":
    case "rate_limited":
    case "code_not_sent":
    case "invalid_input":
      return {
        message: commonFailureMessage(error.reason, error),
        reload: error.reason === "stale_version",
      };
    case "invalid_credentials":
    case "locked":
    case "mfa_code_invalid":
    case "mfa_expired":
    case "invitation_invalid":
    case "totp_invalid":
    case "password_weak":
      return { message: e[error.reason], reload: false };
  }
}

/** The errors of a form read from the DOM, checked with the same schema as the action. */
export function formErrorsOf(
  schema: z.ZodType,
  form: HTMLFormElement,
  extra: Record<string, unknown> = {},
): Record<string, string> {
  const parsed = schema.safeParse({ ...Object.fromEntries(new FormData(form)), ...extra });
  const errors: Record<string, string> = {};
  if (parsed.success) return errors;
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
