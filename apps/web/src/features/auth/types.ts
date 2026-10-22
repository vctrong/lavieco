import type { CommonFailure } from "@/shared/form-failures";

/** Why an auth step failed; mapped to Vietnamese copy by the components. */
export type AuthFailure =
  | CommonFailure
  | "invalid_credentials"
  | "locked"
  | "code_invalid"
  | "code_expired"
  | "attempts_exceeded"
  | "send_limited"
  | "verification_invalid"
  | "email_taken"
  | "password_weak";

export type AuthError = {
  status: "error";
  reason: AuthFailure;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  /** Short reference of the request (start of its `x-request-id`), to find it in logs. */
  ref?: string;
  /** Returned when the code was right but a later step failed, so it need not be re-entered. */
  verificationToken?: string;
};

export type FieldErrors = { status: "invalid"; fieldErrors: Record<string, string> };

export type AuthResult<TOk extends object = object> =
  ({ status: "ok" } & TOk) | AuthError | FieldErrors;

export type CodeSent = { challengeId: string; resendAvailableAt: string };
