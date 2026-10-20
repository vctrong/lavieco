/**
 * Framework-free contracts that `application/` use cases depend on (docs/04 §6.2).
 * Types only: importing this entry point never pulls Nest or Mongoose in.
 */

declare const txBrand: unique symbol;

/** An open database transaction. Opaque to use cases; repositories unwrap it. */
export type TxContext = { readonly [txBrand]: true };

/** Runs work atomically inside ONE service's database (docs/03 §7.2). */
export interface UnitOfWork {
  run<T>(work: (tx: TxContext) => Promise<T>): Promise<T>;
}

/**
 * A job for the outbox. `payload` holds identifiers only, never personal data
 * (CLAUDE §10): handlers load what they need when they run.
 */
export type OutboxJob = {
  type: string;
  payload: Record<string, string | number | boolean | null>;
};

/** Records asynchronous work in the same transaction as the business data (S5). */
export interface OutboxPort {
  enqueue(tx: TxContext, job: OutboxJob): Promise<void>;
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Inline images referenced from the HTML as `cid:<cid>` (ticket QR codes later). */
  attachments?: { filename: string; content: Buffer; contentType: string; cid?: string }[];
};

/** Which route carried an email (ADR-0023): Brevo first, the SMTP_* route as fallback. */
export type MailProvider = "brevo" | "gmail";

export type EmailDelivery = { provider: MailProvider; messageId: string };

/** Outgoing email through the configured provider (`NotifyModule`). */
export interface EmailSender {
  send(message: EmailMessage): Promise<EmailDelivery>;
}

export interface Clock {
  now(): Date;
}
