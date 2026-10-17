import { z } from "zod";

import { isoDateTimeSchema } from "../common/object-id";
import { SERVICE_NAMES } from "../common/service-names";
import { ROLES } from "../permissions/roles";

/** `iss` of every token signed by identity-service. */
export const IDENTITY_ISSUER = "identity-service";

/**
 * `aud` of user access tokens. Staff and member tokens are not interchangeable:
 * a member token is rejected by every endpoint that requires a permission, and the
 * `admin` app only ever holds staff tokens (docs/02 §9.2).
 */
export const TOKEN_AUDIENCES = {
  staff: "lavieco:staff",
  member: "lavieco:member",
  /** Short step between password and second factor of a staff login. */
  mfa: "lavieco:mfa",
  /** Proof that an email address passed an OTP challenge for one purpose. */
  emailVerification: "lavieco:email-verification",
} as const;

/** Claims of a staff access token (EdDSA, short-lived). */
export const staffAccessClaimsSchema = z.object({
  iss: z.literal(IDENTITY_ISSUER),
  aud: z.literal(TOKEN_AUDIENCES.staff),
  sub: z.string(),
  typ: z.literal("staff"),
  roles: z.array(z.enum(ROLES)),
  sid: z.string(),
});
export type StaffAccessClaims = z.infer<typeof staffAccessClaimsSchema>;

/** Claims of a member access token. Members hold no permissions, only ownership. */
export const memberAccessClaimsSchema = z.object({
  iss: z.literal(IDENTITY_ISSUER),
  aud: z.literal(TOKEN_AUDIENCES.member),
  sub: z.string(),
  typ: z.literal("member"),
  sid: z.string(),
});
export type MemberAccessClaims = z.infer<typeof memberAccessClaimsSchema>;

/**
 * Claims of a service token: signed by the CALLER with its own key, `aud` is the
 * target service, lifetime of a minute (docs/02 §6.3).
 */
export const serviceTokenClaimsSchema = z.object({
  iss: z.enum(SERVICE_NAMES),
  sub: z.string(),
  aud: z.enum(SERVICE_NAMES),
});
export type ServiceTokenClaims = z.infer<typeof serviceTokenClaimsSchema>;

/** Access + refresh token pair handed to a BFF, which stores both in httpOnly cookies. */
export const tokenPairSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: isoDateTimeSchema,
  refreshToken: z.string(),
  refreshTokenExpiresAt: isoDateTimeSchema,
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});
export type RefreshSessionRequest = z.infer<typeof refreshSessionRequestSchema>;
