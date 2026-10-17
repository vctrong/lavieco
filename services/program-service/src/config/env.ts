import { z } from "zod";

import { baseServiceEnvSchema, loadConfig, mailEnvSchema } from "@lavieco/service-kit";

const base64Key = (minBytes: number) =>
  z.string().refine((value) => Buffer.from(value, "base64").length >= minBytes, {
    message: `must be base64 of at least ${minBytes} bytes`,
  });

/**
 * program-service environment (docs/04 §8). Documented in `.env.example` and
 * docs/06-bien-moi-truong.md (same commit whenever a variable changes).
 */
export const programEnvSchema = baseServiceEnvSchema.extend(mailEnvSchema.shape).extend({
  /** identity-service JWKS, used to verify staff (and later member) access tokens. */
  IDENTITY_JWKS_URL: z.url(),
  /** Origin of `web`: cache revalidation webhook (`/api/revalidate`). */
  WEB_APP_URL: z.url(),
  /** HMAC key shared with `web` for `/api/revalidate`; base64 of at least 32 bytes. */
  REVALIDATE_SECRET: base64Key(32),
  /**
   * HMAC key of the order links emailed to buyers (`/ve/[token]`, payment page). Changing
   * it breaks every link already sent; base64 of at least 32 bytes.
   */
  TICKET_LINK_SECRET: base64Key(32),
  /** content-service on the private network: attaches and releases event images (ADR-0020). */
  CONTENT_SERVICE_URL: z.url(),
  /**
   * PRIVATE Ed25519 JWK of program-service, signing its service tokens to
   * content-service (ADR-0018). Its public half goes into content-service's
   * SERVICE_TOKEN_TRUSTED_KEYS.
   */
  SERVICE_TOKEN_PRIVATE_JWK: z.string().min(1),
});

export type ProgramEnv = z.infer<typeof programEnvSchema>;

export function loadProgramEnv(env: NodeJS.ProcessEnv = process.env): ProgramEnv {
  return loadConfig(programEnvSchema, env);
}
