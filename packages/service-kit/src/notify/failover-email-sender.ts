import type { Logger } from "@lavieco/observability";

import type { EmailDelivery, EmailMessage, EmailSender } from "../ports";
import { deliver, type MailRoute } from "./mail-routes";

/**
 * Brevo first, the SMTP_* route (Gmail) when Brevo fails for any reason, quota included
 * (ADR-0023). After a Brevo failure the next emails go straight to Gmail for
 * `cooldownMs`, so a person waiting for an OTP does not pay Brevo's timeout again; the
 * pause lives in this process only. Without a Brevo route every email takes SMTP_*.
 */
export class FailoverEmailSender implements EmailSender {
  private brevoPausedUntil = 0;

  constructor(
    private readonly routes: { brevo: MailRoute | null; gmail: MailRoute },
    private readonly options: { cooldownMs: number; logger: Logger; now?: () => number },
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  async send(message: EmailMessage): Promise<EmailDelivery> {
    const { brevo, gmail } = this.routes;
    const recipient = maskEmail(message.to);
    let brevoError: unknown;
    if (brevo && this.now() >= this.brevoPausedUntil) {
      try {
        return await this.attempt(brevo, message, recipient);
      } catch (error) {
        brevoError = error;
        this.brevoPausedUntil = this.now() + this.options.cooldownMs;
        this.options.logger.warn("mail provider failed, falling back", {
          provider: "brevo",
          fallback: "gmail",
          recipient,
          cooldownMs: this.options.cooldownMs,
          ...smtpFailureFields(error),
        });
      }
    }
    try {
      return await this.attempt(gmail, message, recipient);
    } catch (error) {
      this.options.logger.error("mail delivery failed", {
        provider: "gmail",
        recipient,
        ...smtpFailureFields(error),
      });
      // The callers keep handling a failed send as before; both causes stay attached.
      if (brevoError === undefined) throw error;
      throw new AggregateError([brevoError, error], "Brevo and SMTP fallback both failed");
    }
  }

  private async attempt(route: MailRoute, message: EmailMessage, recipient: string) {
    const started = this.now();
    const delivery = await deliver(route, message);
    this.options.logger.info("mail sent", {
      provider: delivery.provider,
      messageId: delivery.messageId,
      durationMs: this.now() - started,
      recipient,
    });
    return delivery;
  }

  /** Closes the pooled connections (end of a CLI run, service shutdown). */
  close(): void {
    this.routes.brevo?.transport.close();
    this.routes.gmail.transport.close();
  }

  onApplicationShutdown(): void {
    this.close();
  }
}

/** `t***@gmail.com`: enough to tell recipients apart in a log, not to contact them. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return "***";
  return `${address[0]}***${address.slice(at)}`;
}

/**
 * Nodemailer's machine-readable failure fields. The server's reply text is left out: it
 * may echo addresses. (`code` would be redacted by the logger, hence `smtpCode`.)
 */
export function smtpFailureFields(error: unknown): { smtpCode?: string; responseCode?: number } {
  if (typeof error !== "object" || error === null) return {};
  const { code, responseCode } = error as { code?: unknown; responseCode?: unknown };
  return {
    ...(typeof code === "string" ? { smtpCode: code } : {}),
    ...(typeof responseCode === "number" ? { responseCode } : {}),
  };
}
