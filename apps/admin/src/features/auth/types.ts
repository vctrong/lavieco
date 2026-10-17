export type StaffAuthFailure =
  | "invalid_credentials"
  | "locked"
  | "mfa_code_invalid"
  | "mfa_expired"
  | "invitation_invalid"
  | "totp_invalid"
  | "password_weak"
  | "unavailable";

export type StaffAuthError = { status: "error"; reason: StaffAuthFailure };
export type StaffFieldErrors = { status: "invalid"; fieldErrors: Record<string, string> };

export type StaffAuthResult<TOk extends object = object> =
  ({ status: "ok" } & TOk) | StaffFieldErrors | StaffAuthError;
