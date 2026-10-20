import { type DynamicModule, Global, Module } from "@nestjs/common";

import type { Logger } from "@lavieco/observability";

import { LOGGER } from "../logging/logging.module";
import type { EmailSender } from "../ports";
import { FailoverEmailSender } from "./failover-email-sender";
import type { MailEnv } from "./mail-env";
import { brevoRoute, gmailRoute } from "./mail-routes";

export { mailEnvSchema, mailConfigIssue, type MailEnv } from "./mail-env";

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

/**
 * SMTP through Nodemailer (docs/06, ADR-0023): Brevo when BREVO_SMTP_KEY is set, with
 * SMTP_* (Gmail) as fallback; SMTP_* alone otherwise (Mailpit in development).
 */
export function createEmailSender(env: MailEnv, logger: Logger): FailoverEmailSender {
  return new FailoverEmailSender(
    { brevo: brevoRoute(env), gmail: gmailRoute(env) },
    { cooldownMs: env.BREVO_COOLDOWN_MINUTES * 60_000, logger },
  );
}

/** Outgoing email (docs/02 §4.2). Templates belong to the service that owns the business. */
@Global()
@Module({})
export class NotifyModule {
  static forRoot(options: { env: MailEnv } | { sender: EmailSender }): DynamicModule {
    return {
      module: NotifyModule,
      providers: [
        {
          provide: EMAIL_SENDER,
          useFactory: (logger: Logger) =>
            "sender" in options ? options.sender : createEmailSender(options.env, logger),
          inject: [LOGGER],
        },
      ],
      exports: [EMAIL_SENDER],
    };
  }
}
