import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import type { PaymentOutcome } from "@lavieco/shared/events";

import type { ConfirmedPayment, PaymentGateway } from "../../orders";
import type { ProductRepository } from "../../shop-catalog";
import type { VoucherLedger } from "../../vouchers";
import type { ShopOrderRecord } from "../domain/shop-order";
import type { ShopOrderRepository } from "./ports";
import { SHOP_ORDER_JOBS } from "./shop-order-jobs";

/**
 * payOS payments of shop orders (BR-15): only a signed webhook or the provider's API
 * confirms one, never the return URL. Idempotent: a second delivery is a `duplicate`.
 * A late payment takes the goods again if they are still there, else asks the team to
 * refund (manual, docs/08 §7.3).
 */
export class ShopSettlementService {
  constructor(
    private readonly orders: ShopOrderRepository,
    private readonly products: ProductRepository,
    private readonly vouchers: VoucherLedger,
    private readonly gateway: PaymentGateway,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  settle(payment: ConfirmedPayment, now = new Date()): Promise<PaymentOutcome> {
    return this.unitOfWork.run((tx) => this.settleOnce(payment, now, tx));
  }

  /** Back on the payment page with the order still unpaid: ask payOS (never trust the URL). */
  async reconcile(order: ShopOrderRecord, now = new Date()) {
    if (order.status !== "awaiting_payment" || !order.payment || !this.gateway.enabled)
      return order;
    const status = await this.gateway.getStatus(order.orderCode).catch(() => null);
    const paid = status?.status === "PAID" ? status.transactions[0] : undefined;
    if (paid) {
      await this.settle(
        {
          orderCode: order.orderCode,
          amount: status!.amountPaid,
          reference: paid.reference,
          paymentLinkId: status!.paymentLinkId,
          transactionAt: paid.transactionDateTime,
          source: "reconcile",
        },
        now,
      );
    }
    return (await this.orders.findById(order.id)) ?? order;
  }

  private async settleOnce(
    payment: ConfirmedPayment,
    now: Date,
    tx: TxContext,
  ): Promise<PaymentOutcome> {
    const order = await this.orders.findByOrderCode(payment.orderCode, tx);
    if (!order) return "unknown_order";
    if (order.paidAt) return "duplicate";
    const entry = { status: "paid" as const, at: now, actorId: null };
    if (payment.amount !== order.amount) {
      await this.orders.transition(
        order.id,
        [order.status],
        { flags: { ...order.flags, amountMismatch: true } },
        { status: order.status, at: now, actorId: null },
        tx,
      );
      await this.alert(order.id, "attention", tx);
      return "amount_mismatch";
    }
    if (order.status === "awaiting_payment" && order.stockState === "held") {
      const saved = await this.orders.transition(
        order.id,
        ["awaiting_payment"],
        { status: "paid", stockState: "committed", paidAt: now, expiresAt: null },
        entry,
        tx,
      );
      if (!saved) return "duplicate";
      for (const item of order.items)
        await this.products.commitStock(item.variantId, item.quantity, tx);
      await this.vouchers.redeem(order.id, now, tx);
      await this.after(order.id, tx);
      return "paid";
    }
    // Paid after the hold ended (expired or cancelled): take the goods again if possible.
    const taken: typeof order.items = [];
    for (const item of order.items) {
      if (await this.products.takeAgain(item.variantId, item.quantity, tx)) taken.push(item);
      else break;
    }
    const complete = taken.length === order.items.length;
    if (!complete)
      for (const item of taken) await this.products.restock(item.variantId, item.quantity, tx);
    await this.orders.transition(
      order.id,
      ["expired", "cancelled"],
      {
        status: "paid",
        paidAt: now,
        stockState: complete ? "committed" : "released",
        flags: { ...order.flags, latePayment: true, refundRequired: !complete },
      },
      entry,
      tx,
    );
    if (order.discount) await this.vouchers.redeemLate(order.id, now, tx);
    if (complete) await this.after(order.id, tx);
    else await this.alert(order.id, "attention", tx);
    return complete ? "paid" : "refund_required";
  }

  private async after(orderId: string, tx: TxContext) {
    await this.outbox.enqueue(tx, {
      type: SHOP_ORDER_JOBS.email,
      payload: { orderId, kind: "paid" },
    });
    await this.alert(orderId, "paid", tx);
  }

  private alert(orderId: string, kind: "paid" | "attention", tx: TxContext) {
    return this.outbox.enqueue(tx, { type: SHOP_ORDER_JOBS.alert, payload: { orderId, kind } });
  }
}
