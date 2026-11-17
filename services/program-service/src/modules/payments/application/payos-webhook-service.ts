import type { PaymentOutcome } from "@lavieco/shared/events";

import type { OrderSettlementService, PaymentGateway } from "../../orders";
import { isShopOrderCode, type ShopSettlementService } from "../../shop-orders";

/** payOS `code` of a successful transfer. */
const SUCCESS = "00";

/**
 * payOS payment webhook, forwarded untouched by `web` (ADR-0015). The signature is
 * checked here with the checksum key (BR-15); a bad one is refused before anything is
 * read. A verified success goes through the shared, idempotent settlement.
 */
export class PayosWebhookService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly settlement: OrderSettlementService,
    private readonly shop: ShopSettlementService,
  ) {}

  async handle(body: unknown): Promise<PaymentOutcome | "ignored"> {
    const payment = await this.gateway.verifyWebhook(body);
    const success =
      typeof body === "object" && body !== null && "success" in body && body.success === true;
    if (!success || payment.code !== SUCCESS) return "ignored";
    // One payOS account for tickets and the shop: the code range says which (ADR-0028).
    const settlement = isShopOrderCode(payment.orderCode) ? this.shop : this.settlement;
    return settlement.settle({
      orderCode: payment.orderCode,
      amount: payment.amount,
      reference: payment.reference,
      paymentLinkId: payment.paymentLinkId,
      transactionAt: payment.transactionDateTime,
      source: "webhook",
    });
  }
}
