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
    case "payment_unavailable":
      return t.payment_unavailable;
    case "unavailable":
    case "bot":
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
