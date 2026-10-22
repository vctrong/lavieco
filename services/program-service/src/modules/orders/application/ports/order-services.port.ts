import type { EmailVerificationClaims, OtpPurpose } from "@lavieco/shared/identity";

import type { PaymentLink } from "../../domain/order";

export const EMAIL_PROOF_VERIFIER = Symbol("EMAIL_PROOF_VERIFIER");
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
export const TICKET_MAILER = Symbol("TICKET_MAILER");
export const ORDER_LINKS = Symbol("ORDER_LINKS");

/** Checks identity-service email proofs with its JWKS (ADR-0021). */
export interface EmailProofVerifier {
  verify(token: string, purpose: OtpPurpose): Promise<EmailVerificationClaims>;
}

export type PaymentLinkRequest = {
  orderCode: number;
  amount: number;
  items: { name: string; quantity: number; price: number }[];
  returnUrl: string;
  cancelUrl: string;
  /** The link must never outlive the seat hold. */
  expiresAt: Date;
};

/** What payOS says about a payment link (`paymentRequests.get`). */
export type PaymentStatus = {
  status: "PENDING" | "CANCELLED" | "UNDERPAID" | "PAID" | "EXPIRED" | "PROCESSING" | "FAILED";
  amountPaid: number;
  paymentLinkId: string;
  transactions: { reference: string; amount: number; transactionDateTime: string }[];
};

/** A webhook whose signature checked out (fields needed for reconciliation only). */
export type VerifiedPayment = {
  orderCode: number;
  amount: number;
  reference: string;
  paymentLinkId: string;
  transactionDateTime: string;
  /** payOS `code` of the transfer; `00` = success. */
  code: string;
};

/**
 * Payment provider (payOS, ADR-0015). Implemented in the `payments` module with the
 * official SDK; `enabled` is false when no payOS credentials are configured, and paid
 * events then refuse bookings before any seat is held.
 */
export interface PaymentGateway {
  readonly enabled: boolean;
  createLink(request: PaymentLinkRequest): Promise<PaymentLink>;
  getStatus(orderCode: number): Promise<PaymentStatus>;
  cancel(orderCode: number, reason: string): Promise<void>;
  /** Throws `payment.signature_invalid` when the signature does not match. */
  verifyWebhook(body: unknown): Promise<VerifiedPayment>;
}

/** Signed, long-lived link to one order (`/ve/[token]`, payment page, cancellation). */
export interface OrderLinks {
  sign(orderId: string): string;
  /** The order id, or null for anything not signed by us. */
  verify(token: string): string | null;
}

/** Sends the ticket email of a paid order (QR codes embedded, docs/05 §5.3). */
export interface TicketMailer {
  /** `resend`: sent again by the team, the email says so. */
  sendTickets(orderId: string, options?: { resend?: boolean }): Promise<void>;
  /** The event of this paid order was cancelled: reason, and what happens to the money. */
  sendEventCancelled(orderId: string): Promise<void>;
}
