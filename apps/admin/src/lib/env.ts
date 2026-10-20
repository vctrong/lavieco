import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  IDENTITY_SERVICE_URL: z.url(),
  PROGRAM_SERVICE_URL: z.url(),
  /** content-service: event image uploads (ADR-0020). */
  CONTENT_SERVICE_URL: z.url(),
  /** Origin of `web`: the event preview is rendered there inside an iframe (D2). */
  WEB_APP_URL: z.url(),
  SERVICE_TOKEN_PRIVATE_JWK: z.string().min(2),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** Parsed on first use; errors list variable names only, never values. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Invalid server environment: ${keys.join(", ")}`);
  }
  cached = parsed.data;
  return cached;
}

const appUrlSchema = z.url().default("http://localhost:3001");

/**
 * Public origin of `admin` (`ADMIN_APP_URL`), the base of every redirect. Parsed on its
 * own so `proxy.ts` never depends on the other variables.
 */
export function adminAppUrl(): string {
  const parsed = appUrlSchema.safeParse(process.env.ADMIN_APP_URL || undefined);
  return parsed.success ? parsed.data : "http://localhost:3001";
}
