import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { displayNameSchema, emailSchema, passwordSchema } from "./password";

/** Version of the consent text the visitor accepted (BR-06): stored with its timestamp. */
export const consentVersionSchema = z.string().min(1).max(64);

/** Create a member account once the email passed an OTP challenge (`purpose: signup`). */
export const memberRegisterRequestSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  verificationToken: z.string().min(10).max(4096),
  consentVersion: consentVersionSchema,
});
export type MemberRegisterRequest = z.infer<typeof memberRegisterRequestSchema>;

export const memberLoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});
export type MemberLoginRequest = z.infer<typeof memberLoginRequestSchema>;

/**
 * Google sign-in (members only, ADR-0016): the BFF ran the authorization-code flow
 * with PKCE and hands over the code; identity-service exchanges it and checks the ID token.
 * `consentVersion` is required only when this creates a new account.
 */
export const memberGoogleRequestSchema = z.object({
  code: z.string().min(1).max(2048),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.url(),
  consentVersion: consentVersionSchema.optional(),
});
export type MemberGoogleRequest = z.infer<typeof memberGoogleRequestSchema>;

/** Set a new password after an OTP challenge with `purpose: reset_password`. */
export const memberPasswordResetRequestSchema = z.object({
  verificationToken: z.string().min(10).max(4096),
  newPassword: passwordSchema,
});
export type MemberPasswordResetRequest = z.infer<typeof memberPasswordResetRequestSchema>;

export const memberProfileSchema = z.object({
  id: objectIdSchema,
  email: z.string(),
  displayName: z.string(),
  emailVerifiedAt: isoDateTimeSchema.nullable(),
  hasPassword: z.boolean(),
  googleLinked: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type MemberProfile = z.infer<typeof memberProfileSchema>;
