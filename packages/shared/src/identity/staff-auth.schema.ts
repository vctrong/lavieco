import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { PERMISSIONS } from "../permissions/permission";
import { ROLES } from "../permissions/roles";
import { displayNameSchema, emailSchema, passwordSchema } from "./password";

/** Step 1 of a staff login: email + password. Always followed by a second factor. */
export const staffLoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});
export type StaffLoginRequest = z.infer<typeof staffLoginRequestSchema>;

export const staffLoginResponseSchema = z.object({
  mfaToken: z.string(),
  mfaTokenExpiresAt: isoDateTimeSchema,
});
export type StaffLoginResponse = z.infer<typeof staffLoginResponseSchema>;

/** 6-digit TOTP code, or a one-time recovery code `xxxxx-xxxxx`. */
export const secondFactorCodeSchema = z
  .string()
  .trim()
  .regex(/^(\d{6}|[a-z0-9]{5}-[a-z0-9]{5})$/);

export const staffMfaRequestSchema = z.object({
  mfaToken: z.string().min(10).max(2048),
  code: secondFactorCodeSchema,
});
export type StaffMfaRequest = z.infer<typeof staffMfaRequestSchema>;

export const staffProfileSchema = z.object({
  id: objectIdSchema,
  email: z.string(),
  displayName: z.string(),
  roles: z.array(z.enum(ROLES)),
  permissions: z.array(z.enum(PERMISSIONS)),
});
export type StaffProfile = z.infer<typeof staffProfileSchema>;

/** Accepting an invitation (also used for the first Super Admin): password + TOTP setup. */
export const invitationInspectRequestSchema = z.object({
  token: z.string().min(20).max(200),
});
export type InvitationInspectRequest = z.infer<typeof invitationInspectRequestSchema>;

export const invitationInspectResponseSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  totp: z.object({
    /** Base32 secret, shown for manual entry in an authenticator app. */
    secret: z.string(),
    otpauthUri: z.string(),
  }),
});
export type InvitationInspectResponse = z.infer<typeof invitationInspectResponseSchema>;

export const invitationAcceptRequestSchema = z.object({
  token: z.string().min(20).max(200),
  displayName: displayNameSchema,
  password: passwordSchema,
  totpCode: z.string().regex(/^\d{6}$/),
});
export type InvitationAcceptRequest = z.infer<typeof invitationAcceptRequestSchema>;

export const invitationAcceptResponseSchema = z.object({
  /** Shown once; only hashes are stored (docs/03 §4.1). */
  recoveryCodes: z.array(z.string()),
});
export type InvitationAcceptResponse = z.infer<typeof invitationAcceptResponseSchema>;
