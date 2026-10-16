import { z } from "zod";

import { baseServiceEnvSchema, loadConfig, mailEnvSchema } from "@lavieco/service-kit";

const base64Key = (minBytes: number) =>
  z.string().refine((value) => Buffer.from(value, "base64").length >= minBytes, {
    message: `must be base64 of at least ${minBytes} bytes`,
  });

/** identity-service environment (docs/04 §8). Documented in `.env.example`. */
export const identityEnvSchema = baseServiceEnvSchema.extend(mailEnvSchema.shape).extend({
  /**
   * Private Ed25519 JWKs used to sign user tokens, as a JSON array; the FIRST signs,
   * the others are still published in the JWKS during a rotation. Never in the DB.
   */
  JWT_SIGNING_KEYS: z.string().min(2),
  /** AES-256-GCM key for TOTP secrets at rest (docs/03 §8.3). */
  TOTP_ENCRYPTION_KEY: base64Key(32),
  /** HMAC pepper for OTP codes and rate-limit keys. */
  OTP_PEPPER: base64Key(32),
  STAFF_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  MEMBER_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  STAFF_REFRESH_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  MEMBER_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  /** Origin of `admin`, used in invitation links. */
  ADMIN_APP_URL: z.url(),
  /** Origin of `web`, used in member emails. */
  WEB_APP_URL: z.url(),
  /** Google sign-in for members (ADR-0016). Leave empty to disable. */
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  /** The only redirect URI accepted for the code exchange (must match the Google console). */
  GOOGLE_REDIRECT_URI: z.string().default(""),
});

export type IdentityEnv = z.infer<typeof identityEnvSchema>;

export function loadIdentityEnv(env: NodeJS.ProcessEnv = process.env): IdentityEnv {
  return loadConfig(identityEnvSchema, env);
}
