import { OTP_RULES, type OtpPurpose } from "@lavieco/shared/identity";

/** One email one-time code (docs/05 §7). Only an HMAC of the code is stored. */
export type OtpChallenge = {
  challengeId: string;
  emailNormalized: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  verifiedAt: Date | null;
  consumedAt: Date | null;
};

export type AttemptCheck = "ok" | "expired" | "attempts_exceeded" | "already_used";

/** Whether one more code may be tried on this challenge. */
export function checkAttempt(challenge: OtpChallenge, now: Date): AttemptCheck {
  if (challenge.verifiedAt || challenge.consumedAt) return "already_used";
  if (challenge.expiresAt.getTime() <= now.getTime()) return "expired";
  if (challenge.attempts >= OTP_RULES.maxAttempts) return "attempts_exceeded";
  return "ok";
}

/**
 * Which email a request produces. Nothing in the API response differs between the
 * cases, so the form never reveals whether an address has an account.
 */
export function mailFor(
  purpose: OtpPurpose,
  account: { exists: boolean; isMember: boolean },
): "code" | "account_exists" | "none" {
  switch (purpose) {
    case "signup":
      return account.exists ? "account_exists" : "code";
    case "reset_password":
      return account.exists && account.isMember ? "code" : "none";
    case "checkout":
    case "ticket_lookup":
      return "code";
  }
}
