import { z } from "zod";

import { isoDateTimeSchema } from "../common/object-id";
import { otpPurposeSchema } from "./enums";
import { emailSchema } from "./password";

/** Length and lifetime rules of an email OTP (docs/05 §7). */
export const OTP_RULES = {
  codeLength: 6,
  ttlSeconds: 5 * 60,
  maxAttempts: 5,
  maxSendsPerEmail: 3,
  maxSendsPerIp: 10,
  sendWindowSeconds: 10 * 60,
  resendCooldownSeconds: 45,
  /** How long the proof of verification stays usable for the next step. */
  verificationTtlSeconds: 15 * 60,
} as const;

export const otpChallengeCreateRequestSchema = z.object({
  email: emailSchema,
  purpose: otpPurposeSchema,
  /** Visitor IP as seen by the BFF; only used, hashed, for rate limiting. Never stored. */
  clientIp: z.string().max(64).optional(),
});
export type OtpChallengeCreateRequest = z.infer<typeof otpChallengeCreateRequestSchema>;

export const otpChallengeCreateResponseSchema = z.object({
  challengeId: z.string(),
  expiresAt: isoDateTimeSchema,
  resendAvailableAt: isoDateTimeSchema,
});
export type OtpChallengeCreateResponse = z.infer<typeof otpChallengeCreateResponseSchema>;

export const otpChallengeVerifyRequestSchema = z.object({
  challengeId: z.string().min(10).max(64),
  code: z.string().regex(/^\d{6}$/),
});
export type OtpChallengeVerifyRequest = z.infer<typeof otpChallengeVerifyRequestSchema>;

export const otpChallengeVerifyResponseSchema = z.object({
  /** Signed proof `{ email, purpose }`, single use, consumed by the next step. */
  verificationToken: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type OtpChallengeVerifyResponse = z.infer<typeof otpChallengeVerifyResponseSchema>;
