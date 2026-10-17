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
    default:
      return e[error.reason];
  }
}

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
