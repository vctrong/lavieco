import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  IDENTITY_SERVICE_URL: z.url(),
  SERVICE_TOKEN_PRIVATE_JWK: z.string().min(2),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default(""),
  TURNSTILE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TURNSTILE_SITE_KEY: z.string().default(""),
  TURNSTILE_SECRET_KEY: z.string().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Server-only configuration, parsed once on first use (not at import, so `next build`
 * does not need runtime secrets). Fails with variable NAMES only, never values.
 */
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

/** Google sign-in is offered only when both values are configured. */
export function googleSignInEnabled(): boolean {
  const env = serverEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_REDIRECT_URI);
}
