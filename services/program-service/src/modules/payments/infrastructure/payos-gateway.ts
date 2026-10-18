import { PayOS, WebhookError, type Webhook } from "@payos/node";

import { DomainError } from "@lavieco/shared";

import type {
  PaymentGateway,
  PaymentLink,
  PaymentLinkRequest,
  PaymentStatus,
  VerifiedPayment,
} from "../../orders";

/**
 * Transfer description shown to the payer and written on the bank statement. payOS
 * limits it to 9 characters for bank accounts not linked through payOS (API docs,
 * checked against SDK 2.0.5): a fixed, short brand word fits every account.
 */
export const PAYOS_DESCRIPTION = "LAVIECO";

export type PayosCredentials = { clientId: string; apiKey: string; checksumKey: string };

/**
 * payOS through the official SDK `@payos/node` 2.x (ADR-0015): `paymentRequests.create`,
 * `.get`, `.cancel` and `webhooks.verify` (HMAC-SHA256 over the sorted `data` fields,
 * with the checksum key that only this service holds). The SDK logger is off: request
 * bodies would carry the buyer's details.
 */
export class PayosGateway implements PaymentGateway {
  readonly enabled = true;
  private readonly client: PayOS;

  constructor(credentials: PayosCredentials, client?: PayOS) {
    this.client =
      client ??
      new PayOS({
        clientId: credentials.clientId,
        apiKey: credentials.apiKey,
        checksumKey: credentials.checksumKey,
        logLevel: "off",
        timeout: 15_000,
      });
  }

  async createLink(request: PaymentLinkRequest): Promise<PaymentLink> {
    // payOS wants a Unix time in seconds; rounding DOWN keeps the link inside the hold.
    const expiredAt = Math.floor(request.expiresAt.getTime() / 1000);
    const link = await this.client.paymentRequests.create({
      orderCode: request.orderCode,
      amount: request.amount,
      description: PAYOS_DESCRIPTION,
      items: request.items,
      returnUrl: request.returnUrl,
      cancelUrl: request.cancelUrl,
      expiredAt,
    });
    return {
      paymentLinkId: link.paymentLinkId,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      bin: link.bin,
      accountNumber: link.accountNumber,
      accountName: link.accountName,
      description: link.description,
      expiresAt: new Date(Math.min(expiredAt, link.expiredAt ?? expiredAt) * 1000),
    };
  }

  async getStatus(orderCode: number): Promise<PaymentStatus> {
    const link = await this.client.paymentRequests.get(orderCode);
    return {
      status: link.status,
      amountPaid: link.amountPaid,
      paymentLinkId: link.id,
      // Reconciliation fields only: never the counterpart's name or account.
      transactions: link.transactions.map((transaction) => ({
        reference: transaction.reference,
        amount: transaction.amount,
        transactionDateTime: transaction.transactionDateTime,
      })),
    };
  }

  async cancel(orderCode: number, reason: string): Promise<void> {
    await this.client.paymentRequests.cancel(orderCode, reason);
  }

  async verifyWebhook(body: unknown): Promise<VerifiedPayment> {
    let data;
    try {
      data = await this.client.webhooks.verify(body as Webhook);
    } catch (error) {
      if (error instanceof WebhookError || error instanceof TypeError) {
        throw new DomainError("payment.signature_invalid");
      }
      throw error;
    }
    return {
      orderCode: data.orderCode,
      amount: data.amount,
      reference: data.reference,
      paymentLinkId: data.paymentLinkId,
      transactionDateTime: data.transactionDateTime,
      code: data.code,
    };
  }

  /** Registers the webhook URL; payOS first sends a sample payment to it. */
  async confirmWebhook(url: string) {
    return this.client.webhooks.confirm(url);
  }
}
