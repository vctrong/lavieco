import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@lavieco/shared/identity";

/**
 * A short deny-list of the most common passwords. A full breached-password check
 * (k-anonymity range query) is still to do: TODO(password-breach-check), docs/02 §9.2.
 */
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "matkhau123",
  "qwertyuiop",
  "11111111",
  "00000000",
  "abc12345",
  "iloveyou",
  "lavieco123",
  "admin123",
]);

export type PasswordCheck = { ok: true } | { ok: false; reason: "length" | "common" | "email" };

/** Password policy shared by staff and members (docs/02 §9.2). */
export function checkPassword(password: string, emailNormalized: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: "length" };
  }
  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) return { ok: false, reason: "common" };
  const localPart = emailNormalized.split("@")[0] ?? "";
  if (localPart.length >= 4 && lowered.includes(localPart)) return { ok: false, reason: "email" };
  return { ok: true };
}
