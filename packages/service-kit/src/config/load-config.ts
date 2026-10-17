import { z } from "zod";

/** Variables every service reads. Each service extends this with its own (docs/04 §8). */
export const baseServiceEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().regex(/^lavieco_[a-z]+$/),
  /**
   * Public keys of the components allowed to call this service with a service token,
   * as a JSON object `{ "<caller>": <public Ed25519 JWK> }` (ADR-0018).
   */
  SERVICE_TOKEN_TRUSTED_KEYS: z.string().default("{}"),
});

export type BaseServiceEnv = z.infer<typeof baseServiceEnvSchema>;

export class ConfigError extends Error {
  constructor(readonly invalidKeys: string[]) {
    super(`Invalid environment: ${invalidKeys.join(", ")}`);
    this.name = "ConfigError";
  }
}

/**
 * Parses the environment once at start-up and fails fast when it is wrong.
 * The error lists variable NAMES only, never values (they may be secrets).
 */
export function loadConfig<TSchema extends z.ZodType>(
  schema: TSchema,
  env: NodeJS.ProcessEnv = process.env,
): z.output<TSchema> {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "?")))];
    throw new ConfigError(keys);
  }
  return parsed.data;
}
