/**
 * Every business error code and the HTTP status it maps to (S6, docs/04 §6.3).
 * Codes are `<domain>.<snake_case>`; the `title` is technical English for logs and
 * Problem Details. Wording shown to people is chosen by the frontend from the code.
 */
export const ERROR_CATALOG = {
  "common.validation_failed": { status: 400, title: "Request validation failed" },
  "common.unauthenticated": { status: 401, title: "Authentication required" },
  "common.forbidden": { status: 403, title: "Permission denied" },
  "common.not_found": { status: 404, title: "Resource not found" },
  "common.conflict": { status: 409, title: "Resource was modified concurrently" },
  "common.rate_limited": { status: 429, title: "Too many requests" },
  "common.internal": { status: 500, title: "Internal error" },
  "common.unavailable": { status: 503, title: "Dependency unavailable" },

  "auth.invalid_credentials": { status: 401, title: "Invalid email or password" },
  "auth.account_locked": { status: 423, title: "Account temporarily locked" },
  "auth.mfa_token_invalid": { status: 401, title: "Second-factor step expired or invalid" },
  "auth.mfa_code_invalid": { status: 401, title: "Invalid second-factor code" },
  "auth.session_invalid": { status: 401, title: "Session is invalid or was revoked" },

  "password.too_weak": { status: 400, title: "Password does not meet the policy" },

  "invitation.invalid": { status: 400, title: "Invitation is invalid, used or expired" },
  "invitation.totp_invalid": { status: 400, title: "Authenticator code does not match" },

  "otp.code_invalid": { status: 400, title: "Verification code is incorrect" },
  "otp.expired": { status: 410, title: "Verification code expired" },
  "otp.attempts_exceeded": { status: 429, title: "Too many incorrect codes" },
  "otp.send_limited": { status: 429, title: "Too many codes requested" },
  "otp.verification_invalid": { status: 400, title: "Email verification is invalid or used" },

  "member.email_taken": { status: 409, title: "An account already exists for this email" },
  "member.consent_required": { status: 422, title: "Data-processing consent is required" },
  "member.google_failed": { status: 400, title: "Google sign-in could not be completed" },
  "member.google_not_allowed": { status: 403, title: "Google sign-in is not available here" },
} as const satisfies Record<string, { status: number; title: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const PROBLEM_TYPE_BASE = "https://lavieco.io.vn/problems/";

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CATALOG, value);
}
