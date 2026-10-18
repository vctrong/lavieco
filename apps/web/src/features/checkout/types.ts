/** Why a checkout or lookup step failed; mapped to Vietnamese copy by the components. */
export type CheckoutFailure =
  | "unavailable"
  | "bot"
  | "code_invalid"
  | "code_expired"
  | "attempts_exceeded"
  | "send_limited"
  | "verification_invalid"
  | "sold_out"
  | "items_invalid"
  | "answers_invalid"
  | "consent_required"
  | "registration_closed"
  | "payment_unavailable"
  | "email_mismatch"
  | "invalid_state";

export type CheckoutError = {
  status: "error";
  reason: CheckoutFailure;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};

export type FieldErrors = { status: "invalid"; fieldErrors: Record<string, string> };

export type CheckoutResult<TOk extends object = object> =
  ({ status: "ok" } & TOk) | CheckoutError | FieldErrors;

export type CodeSent = { challengeId: string; resendAvailableAt: string };

/** Where the browser goes once the order exists. */
export type OrderPlaced = { redirectTo: string };
