import { z } from "zod";

import { baseServiceEnvSchema, loadConfig } from "@lavieco/service-kit";

/** content-service environment (docs/04 §8). Documented in `.env.example`. */
export const contentEnvSchema = baseServiceEnvSchema.extend({
  /** identity-service JWKS, used to verify staff and member access tokens. */
  IDENTITY_JWKS_URL: z.url(),
  /**
   * Cloudinary product environment (ADR-0020): a DIFFERENT one for development and
   * production, so a developer key can never touch production images. The secret
   * lives in this service only.
   */
  CLOUDINARY_CLOUD_NAME: z.string().regex(/^[a-z0-9_-]+$/i),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

export type ContentEnv = z.infer<typeof contentEnvSchema>;

export function loadContentEnv(env: NodeJS.ProcessEnv = process.env): ContentEnv {
  return loadConfig(contentEnvSchema, env);
}

/** Root folder of uploaded images, derived from NODE_ENV (never configurable by hand). */
export function mediaRootFolder(env: Pick<ContentEnv, "NODE_ENV">): "lavieco/prod" | "lavieco/dev" {
  return env.NODE_ENV === "production" ? "lavieco/prod" : "lavieco/dev";
}
