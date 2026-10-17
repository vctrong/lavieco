import { z } from "zod";

import { isoDateTimeSchema } from "../common/object-id";
import { ROLES } from "../permissions/roles";
import { otpPurposeSchema } from "./enums";
import { secondFactorCodeSchema } from "./staff-auth.schema";
import { IDENTITY_ISSUER, TOKEN_AUDIENCES } from "./tokens";

/**
 * Step-up (ADR-0021): a staff member re-enters a TOTP code right before a sensitive
 * action (export of personal data, marking a refund). identity-service answers with a
 * 5-minute token bound to the session; the target service checks it with the JWKS.
 */
export const STEP_UP_HEADER = "x-step-up-token";
export const STEP_UP_TTL_SECONDS = 5 * 60;

export const stepUpRequestSchema = z.object({
  /** TOTP only: a recovery code is for getting back in, not for confirming an export. */
  code: secondFactorCodeSchema.refine((code) => /^\d{6}$/.test(code), {
    message: "Expected a 6-digit authenticator code",
  }),
});
export type StepUpRequest = z.infer<typeof stepUpRequestSchema>;

export const stepUpResponseSchema = z.object({
  stepUpToken: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type StepUpResponse = z.infer<typeof stepUpResponseSchema>;

/** Claims of a step-up token: same user AND same session as the access token. */
export const stepUpClaimsSchema = z.object({
  iss: z.literal(IDENTITY_ISSUER),
  aud: z.literal(TOKEN_AUDIENCES.stepUp),
  sub: z.string(),
  sid: z.string(),
});
export type StepUpClaims = z.infer<typeof stepUpClaimsSchema>;

/**
 * Claims of an email verification proof (OTP, or a member's verified email). `sub` is
 * the verification id: single use, enforced by the service that consumes it. `uid`
 * is set only when the proof was issued to a signed-in member.
 */
export const emailVerificationClaimsSchema = z.object({
  iss: z.literal(IDENTITY_ISSUER),
  aud: z.literal(TOKEN_AUDIENCES.emailVerification),
  sub: z.string().min(10),
  email: z.string(),
  purpose: otpPurposeSchema,
  uid: z.string().optional(),
  exp: z.number().int(),
});
export type EmailVerificationClaims = z.infer<typeof emailVerificationClaimsSchema>;

/**
 * A signed-in member asks for a proof of their own verified email, so the checkout
 * skips the OTP step (docs/05 §2). Refused when the email is not verified.
 */
export const memberEmailProofRequestSchema = z.object({
  purpose: z.enum(["checkout"]),
});
export type MemberEmailProofRequest = z.infer<typeof memberEmailProofRequestSchema>;

/**
 * Audit event sent by another service through its outbox (docs/03 §4.4). `meta` is
 * small and never holds personal data; identity fills the actor's email itself.
 */
export const auditEventIngestRequestSchema = z.object({
  at: isoDateTimeSchema,
  action: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z_]+\.[a-z_]+$/),
  actor: z.object({ userId: z.string().min(1).max(64), roles: z.array(z.enum(ROLES)).max(10) }),
  target: z.object({ type: z.string().min(1).max(60), id: z.string().min(1).max(64) }).nullable(),
  result: z.enum(["success", "failure"]),
  requestId: z.string().max(128).nullable(),
  meta: z
    .record(z.string().max(60), z.union([z.string().max(200), z.number(), z.boolean()]))
    .refine((meta) => Object.keys(meta).length <= 20, { message: "Too many meta fields" }),
});
export type AuditEventIngestRequest = z.infer<typeof auditEventIngestRequestSchema>;
