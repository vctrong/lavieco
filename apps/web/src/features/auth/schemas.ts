import { z } from "zod";

import { TEXT } from "./constants/text";

const v = TEXT.vi.validation;

const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email({ error: v.email }));
const newPassword = z.string().min(8, { error: v.password }).max(128, { error: v.password });
const code = z.string().regex(/^\d{6}$/, { error: v.code });

/** Same schemas on the client (UX) and in the Server Actions (safety), docs/04 §5.5. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: v.passwordRequired }).max(256),
});

export const signupDetailsSchema = z.object({
  displayName: z.string().trim().min(1, { error: v.displayName }).max(80, { error: v.displayName }),
  email,
  password: newPassword,
  consent: z.literal("yes", { error: v.consent }),
});

export const signupCompleteSchema = signupDetailsSchema.extend({
  challengeId: z.string().min(10).max(64),
  code,
  /** Kept by the client when only the password was refused after a successful code. */
  verificationToken: z.string().max(4096).optional(),
});

export const resetRequestSchema = z.object({ email });

export const resetCompleteSchema = z.object({
  email,
  challengeId: z.string().min(10).max(64),
  code,
  newPassword,
  verificationToken: z.string().max(4096).optional(),
});

/** Anti-bot fields sent with every public form: honeypot + optional Turnstile token. */
export const botFieldsSchema = z.object({
  website: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().max(2048).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupDetailsInput = z.infer<typeof signupDetailsSchema>;
export type SignupCompleteInput = z.infer<typeof signupCompleteSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetCompleteInput = z.infer<typeof resetCompleteSchema>;
