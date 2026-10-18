import { z } from "zod";

import { mailConfigIssue } from "../notify/mail-env";

/** Variables every service reads. Each service extends this with its own (docs/04 §8). */
export const baseServiceEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z.string().min(1),
  /** `lavieco_<service>`; the `_dev` suffix marks a development database on Atlas. */
  MONGODB_DB: z.string().regex(/^lavieco_[a-z]+(?:_dev)?$/),
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
  const isolation = databaseIsolationIssue(parsed.data as DatabaseEnv);
  if (isolation) throw new ConfigError([isolation]);
  const mail = mailConfigIssue(parsed.data as Parameters<typeof mailConfigIssue>[0]);
  if (mail) throw new ConfigError([mail]);
  return parsed.data;
}

type DatabaseEnv = { NODE_ENV?: unknown; MONGODB_URI?: unknown; MONGODB_DB?: unknown };

const ATLAS_HOST = /\.mongodb\.net(?=[:/,?]|$)/i;

/**
 * Keeps development away from production data (docs/04 §11.1). Outside production a
 * service may only reach Atlas with a `_dev` database (and a dedicated Atlas user that
 * has rights on `*_dev` only); production never uses a `_dev` database. Returns the
 * offending variable name, or null. Mirrored by `infra/scripts/env-check.mjs`.
 */
export function databaseIsolationIssue(env: DatabaseEnv): "MONGODB_DB" | null {
  if (typeof env.MONGODB_URI !== "string" || typeof env.MONGODB_DB !== "string") return null;
  const devDatabase = env.MONGODB_DB.endsWith("_dev");
  if (env.NODE_ENV === "production") return devDatabase ? "MONGODB_DB" : null;
  return ATLAS_HOST.test(env.MONGODB_URI) && !devDatabase ? "MONGODB_DB" : null;
}
