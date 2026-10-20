import { createTransport, type SendMailOptions } from "nodemailer";

import type { EmailDelivery, EmailMessage, MailProvider } from "../ports";
import { isLoopbackHost, type MailEnv } from "./mail-env";

/** The part of a Nodemailer transporter the senders use; tests pass a fake. */
export type MailTransport = {
  sendMail(options: SendMailOptions): Promise<{ messageId?: string }>;
  verify(): Promise<unknown>;
  close(): void;
};

/** One way out: a transport, the sender it is allowed to use, and where it points. */
export type MailRoute = {
  provider: MailProvider;
  transport: MailTransport;
  from: string;
  replyTo?: string;
  /** `host:port`, for messages to an operator; never the login. */
  via: string;
};

// Brevo answers fast or not at all: short limits leave room for the Gmail fallback
// within the 20 s `web` waits for an OTP request (ADR-0023).
const BREVO_TIMEOUTS = { connectionTimeout: 5_000, greetingTimeout: 5_000, socketTimeout: 8_000 };
const SMTP_TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

function smtpTransport(options: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  timeouts: typeof SMTP_TIMEOUTS;
}): MailTransport {
  const auth = options.user ? { user: options.user, pass: options.pass } : undefined;
  return createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    // A password never crosses the network in clear: off-machine logins must upgrade
    // to TLS (STARTTLS on 587) or the send fails.
    requireTLS: !options.secure && Boolean(auth) && !isLoopbackHost(options.host),
    auth,
    // OTP codes are sent inside the request: reuse a logged-in connection instead of a
    // new TCP + TLS + login (seconds with a real provider) for every email.
    pool: true,
    maxConnections: 2,
    ...options.timeouts,
  });
}

/** Brevo SMTP relay, or null when BREVO_SMTP_KEY is empty (development, Gmail only). */
export function brevoRoute(env: MailEnv): MailRoute | null {
  if (!env.BREVO_SMTP_KEY) return null;
  return {
    provider: "brevo",
    transport: smtpTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465,
      user: env.BREVO_SMTP_USER,
      pass: env.BREVO_SMTP_KEY,
      timeouts: BREVO_TIMEOUTS,
    }),
    from: env.MAIL_FROM,
    replyTo: env.MAIL_REPLY_TO,
    via: `${env.BREVO_SMTP_HOST}:${env.BREVO_SMTP_PORT}`,
  };
}

/** The SMTP_* route: Gmail in production, Mailpit in development. */
export function gmailRoute(env: MailEnv): MailRoute {
  return {
    provider: "gmail",
    transport: smtpTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      timeouts: SMTP_TIMEOUTS,
    }),
    // Gmail rewrites (or DMARC rejects) a From that is not the signed-in account.
    from: env.MAIL_FROM_FALLBACK ?? env.MAIL_FROM,
    replyTo: env.MAIL_REPLY_TO,
    via: `${env.SMTP_HOST}:${env.SMTP_PORT}${env.SMTP_SECURE ? " (TLS)" : ""}`,
  };
}

/** Sends one message through one route. */
export async function deliver(route: MailRoute, message: EmailMessage): Promise<EmailDelivery> {
  const info = await route.transport.sendMail({
    from: route.from,
    replyTo: route.replyTo,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments,
  });
  return { provider: route.provider, messageId: info.messageId ?? "" };
}
