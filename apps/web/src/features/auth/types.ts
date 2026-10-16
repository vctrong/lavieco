/** Why an auth step failed; mapped to Vietnamese copy by the components. */
export type AuthFailure =
  | "invalid_credentials"
  | "locked"
  | "code_invalid"
  | "code_expired"
  | "attempts_exceeded"
  | "send_limited"
  | "verification_invalid"
  | "email_taken"
  | "password_weak"
  | "unavailable"
  | "bot";

export type AuthError = {
  status: "error";
  reason: AuthFailure;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  /** Returned when the code was right but a later step failed, so it need not be re-entered. */
  verificationToken?: string;
};

export type FieldErrors = { status: "invalid"; fieldErrors: Record<string, string> };

export type AuthResult<TOk extends object = object> =
  ({ status: "ok" } & TOk) | AuthError | FieldErrors;

export type CodeSent = { challengeId: string; resendAvailableAt: string };
