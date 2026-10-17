import { type DynamicModule, Global, Module } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { z } from "zod";

import type { EmailMessage, EmailSender } from "../ports";

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");

/** Mail settings each sending service adds to its env schema (docs/05 §8). */
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

/** SMTP through Nodemailer (Mailpit in development). Swap the adapter to change provider. */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: Transporter;

  constructor(private readonly env: MailEnv) {
    this.transport = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
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
