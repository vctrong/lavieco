import { z } from "zod";

import { baseServiceEnvSchema, loadConfig } from "@lavieco/service-kit";

/** program-service environment (docs/04 §8). Documented in `.env.example`. */
export const programEnvSchema = baseServiceEnvSchema.extend({
  /** identity-service JWKS, used to verify staff (and later member) access tokens. */
  IDENTITY_JWKS_URL: z.url(),
  /** Origin of `web`: cache revalidation webhook (`/api/revalidate`). */
  WEB_APP_URL: z.url(),
  /** HMAC key shared with `web` for `/api/revalidate`; base64 of at least 32 bytes. */
  REVALIDATE_SECRET: z.string().refine((value) => Buffer.from(value, "base64").length >= 32, {
    message: "must be base64 of at least 32 bytes",
  }),
});

export type ProgramEnv = z.infer<typeof programEnvSchema>;

export function loadProgramEnv(env: NodeJS.ProcessEnv = process.env): ProgramEnv {
  return loadConfig(programEnvSchema, env);
}
