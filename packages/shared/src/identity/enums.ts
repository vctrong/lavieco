import { z } from "zod";

/** `staff` = LAVIECO admins (2FA mandatory); `member` = public accounts (docs/05, ADR-0016). */
export const USER_TYPES = ["staff", "member"] as const;
export const userTypeSchema = z.enum(USER_TYPES);
export type UserType = z.infer<typeof userTypeSchema>;

export const USER_STATUSES = ["invited", "active", "locked", "disabled"] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** What an email one-time code proves; one shared mechanism for all of them (docs/05 §3). */
export const OTP_PURPOSES = ["signup", "reset_password", "checkout", "ticket_lookup"] as const;
export const otpPurposeSchema = z.enum(OTP_PURPOSES);
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;
