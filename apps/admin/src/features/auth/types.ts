import type { CommonFailure } from "@/shared/form-failures";

export type StaffAuthFailure =
  | CommonFailure
  | "invalid_credentials"
  | "locked"
  | "mfa_code_invalid"
  | "mfa_expired"
  | "invitation_invalid"
  | "totp_invalid"
  | "password_weak";

export type StaffAuthError = {
  status: "error";
  reason: StaffAuthFailure;
  retryAfterSeconds?: number;
  /** Short reference of the request (start of its `x-request-id`), to find it in logs. */
  ref?: string;
};
export type StaffFieldErrors = { status: "invalid"; fieldErrors: Record<string, string> };

export type StaffAuthResult<TOk extends object = object> =
  ({ status: "ok" } & TOk) | StaffFieldErrors | StaffAuthError;
