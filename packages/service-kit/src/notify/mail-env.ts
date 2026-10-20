import { z } from "zod";

/** `KEY=` in a .env file means "not set", so a default still applies. */
const unset = (value: unknown) => (value === "" ? undefined : value);

/**
 * Mail settings each sending service adds to its env schema (docs/06, ADR-0023). Brevo
 * (BREVO_*) is the primary route when BREVO_SMTP_KEY is set; SMTP_* is the fallback
 * (Gmail in production) and the only route without a Brevo key, which keeps development
 * on Mailpit. identity-service and program-service must carry the same mail block.
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
  /** Sender on the Brevo route: an address of the verified domain (SPF/DKIM). */
  MAIL_FROM: z.string().min(3),
  /** Sender on the SMTP_* route: the Gmail address itself. Defaults to MAIL_FROM. */
  MAIL_FROM_FALLBACK: z.preprocess(unset, z.string().min(3).optional()),
  MAIL_REPLY_TO: z.preprocess(unset, z.string().min(3).optional()),
  BREVO_SMTP_HOST: z.preprocess(unset, z.string().min(1).default("smtp-relay.brevo.com")),
  BREVO_SMTP_PORT: z.preprocess(unset, z.coerce.number().int().min(1).max(65535).default(587)),
  BREVO_SMTP_USER: z.preprocess(unset, z.string().optional()),
  /** Empty = no Brevo: every email goes through SMTP_*. */
  BREVO_SMTP_KEY: z.preprocess(unset, z.string().optional()),
  /** How long Brevo is skipped after it failed once. */
  BREVO_COOLDOWN_MINUTES: z.preprocess(unset, z.coerce.number().int().min(1).max(1440).default(15)),
});

export type MailEnv = z.infer<typeof mailEnvSchema>;

type MailSettings = {
  SMTP_HOST?: unknown;
  SMTP_PORT?: unknown;
  SMTP_SECURE?: unknown;
  SMTP_USER?: unknown;
  SMTP_PASS?: unknown;
  MAIL_FROM?: unknown;
  MAIL_FROM_FALLBACK?: unknown;
  BREVO_SMTP_USER?: unknown;
  BREVO_SMTP_KEY?: unknown;
};

export type MailConfigIssue =
  | "SMTP_PASS"
  | "SMTP_USER"
  | "SMTP_SECURE"
  | "BREVO_SMTP_USER"
  | "BREVO_SMTP_KEY"
  | "MAIL_FROM_FALLBACK";

const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|::1|\[::1\])$/i;

/** Mailpit or a relay on the same machine: no TLS to require. */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK.test(host.trim());
}

/** Domain of `Name <user@domain>` or `user@domain`, lower-cased; "" when there is none. */
export function senderDomain(from: string): string {
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const at = address.lastIndexOf("@");
  return at < 0
    ? ""
    : address
        .slice(at + 1)
        .trim()
        .toLowerCase();
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Settings that each parse alone but cannot work together. Returns the variable to fix,
 * or null; never a value. Mirrored by `infra/scripts/env-check.mjs`.
 */
export function mailConfigIssue(env: MailSettings): MailConfigIssue | null {
  if (typeof env.SMTP_HOST !== "string") return null;
  const user = text(env.SMTP_USER);
  const pass = text(env.SMTP_PASS);
  if (user && !pass) return "SMTP_PASS";
  if (pass && !user) return "SMTP_USER";
  // 465 speaks TLS from the first byte; 587/25 start in clear and upgrade (STARTTLS).
  const port = Number(env.SMTP_PORT);
  const secure = env.SMTP_SECURE === true || env.SMTP_SECURE === "true";
  if (port === 465 && !secure) return "SMTP_SECURE";
  if (secure && (port === 587 || port === 25)) return "SMTP_SECURE";

  const brevoUser = text(env.BREVO_SMTP_USER);
  const brevoKey = text(env.BREVO_SMTP_KEY);
  if (brevoKey && !brevoUser) return "BREVO_SMTP_USER";
  if (brevoUser && !brevoKey) return "BREVO_SMTP_KEY";
  if (brevoKey) {
    // With Brevo in front, the fallback sends through Gmail: a From on the verified
    // domain would fail DMARC there, so the fallback needs its own (Gmail) address.
    const fallback = text(env.MAIL_FROM_FALLBACK);
    if (!fallback) return "MAIL_FROM_FALLBACK";
    const primaryDomain = senderDomain(text(env.MAIL_FROM));
    if (primaryDomain !== "gmail.com" && senderDomain(fallback) === primaryDomain) {
      return "MAIL_FROM_FALLBACK";
    }
  }
  return null;
}
