import type { TxContext } from "@lavieco/service-kit/ports";
import type { OtpPurpose } from "@lavieco/shared/identity";

import type { OtpChallenge } from "../../domain/otp-challenge";

export const OTP_REPOSITORY = Symbol("OTP_REPOSITORY");
export const RATE_LIMITER = Symbol("RATE_LIMITER");
export const OTP_MAILER = Symbol("OTP_MAILER");

export interface OtpRepository {
  insert(challenge: OtpChallenge): Promise<void>;
  findByChallengeId(challengeId: string): Promise<OtpChallenge | null>;
  /** +1 attempt, only while below the limit; returns the new count or null when refused. */
  incrementAttempts(challengeId: string, max: number): Promise<number | null>;
  markVerified(challengeId: string, at: Date): Promise<boolean>;
  /** Single use: sets `consumedAt` only if verified and not consumed yet. */
  consume(challengeId: string, at: Date, tx?: TxContext): Promise<boolean>;
  delete(challengeId: string): Promise<void>;
}

/** Fixed-window counter; `key` is already a keyed hash (no raw email or IP stored). */
export interface RateLimiter {
  hit(
    key: string,
    limit: number,
    windowSeconds: number,
    now: Date,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export interface OtpMailer {
  sendCode(to: string, code: string, purpose: OtpPurpose): Promise<void>;
  sendAccountExists(to: string): Promise<void>;
}
