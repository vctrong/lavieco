import { z } from "zod";

/**
 * Mail settings each sending service adds to its env schema (docs/06). Development
 * points at Mailpit; real delivery only happens once SMTP_* name a real provider.
 */
export const mailEnvSchema = z.object({
  MAIL_PROVIDER: z.enum(["smtp"]).default("smtp"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(3),
});

export type MailEnv = z.infer<typeof mailEnvSchema>;

type MailSettings = {
  SMTP_HOST?: unknown;
  SMTP_PORT?: unknown;
  SMTP_SECURE?: unknown;
  SMTP_USER?: unknown;
  SMTP_PASS?: unknown;
};

const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|::1|\[::1\])$/i;

/** Mailpit or a relay on the same machine: no TLS to require. */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK.test(host.trim());
}

/**
 * Settings that each parse alone but cannot work together. Returns the variable to fix,
 * or null; never a value. Mirrored by `infra/scripts/env-check.mjs`.
 */
export function mailConfigIssue(
  env: MailSettings,
): "SMTP_PASS" | "SMTP_USER" | "SMTP_SECURE" | null {
  if (typeof env.SMTP_HOST !== "string") return null;
  const user = typeof env.SMTP_USER === "string" ? env.SMTP_USER : "";
  const pass = typeof env.SMTP_PASS === "string" ? env.SMTP_PASS : "";
  if (user && !pass) return "SMTP_PASS";
  if (pass && !user) return "SMTP_USER";
  // 465 speaks TLS from the first byte; 587/25 start in clear and upgrade (STARTTLS).
  const port = Number(env.SMTP_PORT);
  const secure = env.SMTP_SECURE === true || env.SMTP_SECURE === "true";
  if (port === 465 && !secure) return "SMTP_SECURE";
  if (secure && (port === 587 || port === 25)) return "SMTP_SECURE";
  return null;
}
