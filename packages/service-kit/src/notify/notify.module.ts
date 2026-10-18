import { type DynamicModule, Global, Module } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

import type { EmailMessage, EmailSender } from "../ports";
import { isLoopbackHost, type MailEnv } from "./mail-env";

export { mailEnvSchema, mailConfigIssue, type MailEnv } from "./mail-env";

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

/**
 * SMTP through Nodemailer: Mailpit in development, a real provider once SMTP_* say so
 * (docs/06). Swap the adapter to change provider.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: Transporter;

  constructor(private readonly env: MailEnv) {
    const auth = env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined;
    this.transport = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      // A password never crosses the network in clear: off-machine logins must upgrade
      // to TLS (STARTTLS on 587) or the send fails.
      requireTLS: !env.SMTP_SECURE && Boolean(auth) && !isLoopbackHost(env.SMTP_HOST),
      auth,
      // OTP codes are sent inside the request: reuse a logged-in connection instead of a
      // new TCP + TLS + login (seconds with a real provider) for every email.
      pool: true,
      maxConnections: 2,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /** Connects and logs in without sending anything (`npm run mail:test`). */
  async verify(): Promise<void> {
    await this.transport.verify();
  }

  /** Closes the pooled connections (end of a CLI run, service shutdown). */
  close(): void {
    this.transport.close();
  }

  onApplicationShutdown(): void {
    this.close();
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
    });
  }
}

/** Outgoing email (docs/02 §4.2). Templates belong to the service that owns the business. */
@Global()
@Module({})
export class NotifyModule {
  static forRoot(options: { env: MailEnv } | { sender: EmailSender }): DynamicModule {
    const sender = "sender" in options ? options.sender : new SmtpEmailSender(options.env);
    return {
      module: NotifyModule,
      providers: [{ provide: EMAIL_SENDER, useValue: sender }],
      exports: [EMAIL_SENDER],
    };
  }
}
