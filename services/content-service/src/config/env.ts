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
  /**
   * identity-service on the private network: audit events and staff alerts of the
   * handbook go there through the outbox (ADR-0021, ADR-0027).
   */
  IDENTITY_SERVICE_URL: z.url(),
  /**
   * PRIVATE Ed25519 JWK of content-service, signing its service tokens to
   * identity-service (ADR-0018). Its public half goes into identity-service's
   * SERVICE_TOKEN_TRUSTED_KEYS as "content-service".
   */
  SERVICE_TOKEN_PRIVATE_JWK: z.string().min(1),
  /**
   * Folder of handbook uploads while they are imported (ADR-0029). Files are deleted
   * once imported, and after 24 hours at the latest. Empty: the OS temp folder.
   */
  HANDBOOK_UPLOAD_DIR: z.string().default(""),
  /** Cache revalidation of the public handbook on `web` after a publish (HMAC, CLAUDE §8). */
  WEB_APP_URL: z.url(),
  /** Same value as REVALIDATE_SECRET of apps/web (base64 of at least 32 bytes). */
  REVALIDATE_SECRET: z.string().refine((value) => Buffer.from(value, "base64").length >= 32, {
    message: "Expected base64 of at least 32 bytes",
  }),
});

export type ContentEnv = z.infer<typeof contentEnvSchema>;

export function loadContentEnv(env: NodeJS.ProcessEnv = process.env): ContentEnv {
  return loadConfig(contentEnvSchema, env);
}

/** Root folder of uploaded images, derived from NODE_ENV (never configurable by hand). */
export function mediaRootFolder(env: Pick<ContentEnv, "NODE_ENV">): "lavieco/prod" | "lavieco/dev" {
  return env.NODE_ENV === "production" ? "lavieco/prod" : "lavieco/dev";
}
