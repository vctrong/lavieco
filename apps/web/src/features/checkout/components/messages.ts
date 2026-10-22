import { commonFailureMessage, type FormFailure } from "@/shared/form-failures";

import { TEXT } from "../constants/text";
import type { CheckoutError } from "../types";

/** Vietnamese message for a failed step. */
export function messageFor(error: CheckoutError): string {
  const t = TEXT.vi.errors;
  switch (error.reason) {
    case "code_invalid":
      return error.remainingAttempts !== undefined
        ? t.code_invalid_left(error.remainingAttempts)
        : t.code_invalid;
    case "send_limited":
      return error.retryAfterSeconds !== undefined
        ? t.send_limited_in(error.retryAfterSeconds)
        : t.send_limited;
    case "unavailable":
    case "stale_version":
    case "offline":
    case "bot":
    case "rate_limited":
    case "code_not_sent":
    case "invalid_input":
      return commonFailureMessage(error.reason, error);
    case "payment_unavailable":
    case "code_expired":
    case "attempts_exceeded":
    case "verification_invalid":
    case "sold_out":
    case "items_invalid":
    case "answers_invalid":
    case "consent_required":
    case "registration_closed":
    case "email_mismatch":
    case "invalid_state":
      return t[error.reason];
  }
}

export const failureOf = (error: CheckoutError): FormFailure => ({
  message: messageFor(error),
  reload: error.reason === "stale_version",
});

/** The form field a failure belongs to, so it also shows under that field. */
export function fieldOfFailure(error: CheckoutError): string | null {
  switch (error.reason) {
    case "sold_out":
    case "items_invalid":
      return "tickets";
    default:
      return null;
  }
}
