import { commonFailureMessage, type FormFailure } from "@/shared/form-failures";

import { TEXT } from "../constants/text";
import type { AuthError } from "../types";

/** Vietnamese explanation of a failed auth step. */
export function messageFor(error: AuthError): string {
  const e = TEXT.vi.errors;
  switch (error.reason) {
    case "code_invalid":
      return error.remainingAttempts !== undefined
        ? e.code_invalid_remaining(error.remainingAttempts)
        : e.code_invalid;
    case "send_limited":
      return e.send_limited(error.retryAfterSeconds ?? 600);
    case "unavailable":
    case "stale_version":
    case "offline":
    case "bot":
    case "rate_limited":
    case "code_not_sent":
    case "invalid_input":
      return commonFailureMessage(error.reason, error);
    case "invalid_credentials":
    case "locked":
    case "code_expired":
    case "attempts_exceeded":
    case "verification_invalid":
    case "email_taken":
    case "password_weak":
      return e[error.reason];
  }
}

export const failureOf = (error: AuthError): FormFailure => ({
  message: messageFor(error),
  reload: error.reason === "stale_version",
});

/** Errors arriving in the URL after a Google sign-in round-trip (`?loi=...`). */
export function messageForUrlError(code: string | undefined): string | null {
  const e = TEXT.vi.errors;
  switch (code) {
    case "google":
      return e.google;
    case "google-quan-tri":
      return e.googleNotAllowed;
    case "google-dong-y":
      return e.googleConsent;
    default:
      return null;
  }
}
