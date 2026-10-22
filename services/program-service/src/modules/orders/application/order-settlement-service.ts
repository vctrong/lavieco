import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { PaymentOutcome } from "@lavieco/shared/events";

import { REVALIDATE_EVENT_JOB, type EventRepository } from "../../events";
import type { TicketTypeRepository } from "../../ticketing";
import { planSettlement, type OrderRecord } from "../domain/order";
import { issueAndSend } from "./order-jobs";
import type {
  OrderRepository,
  PaymentEventRepository,
  TicketRepository,
} from "./ports/order-repositories.port";
import type { PaymentGateway } from "./ports/order-services.port";

/** A payment payOS confirmed: from a verified webhook, or from `paymentRequests.get`. */
export type ConfirmedPayment = {
  orderCode: number;
  amount: number;
  reference: string | null;
  paymentLinkId: string | null;
  transactionAt: string | null;
  source: "webhook" | "reconcile";
};

/** Thrown inside the transaction (so it rolls back) when a guarded update missed. */
class SettlementRace extends Error {
  override name = "SettlementRace";
}

/** How long a public "check again" waits before asking payOS again for the same order. */
const PUBLIC_RECONCILE_INTERVAL_MS = 10_000;

/**
 * The ONE place that turns a payment into a paid order (BR-15), shared by the webhook,
 * "Kiểm tra lại thanh toán" and the return page. Idempotent per order: every change is
 * a guarded update on the order's status, inside one transaction with the seat counters,
 * the tickets, the ticket email (outbox) and the payment event.
 */
export class OrderSettlementService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly tickets: TicketRepository,
    private readonly paymentEvents: PaymentEventRepository,
    private readonly events: EventRepository,
    private readonly gateway: PaymentGateway,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  async settle(payment: ConfirmedPayment, now = new Date()): Promise<PaymentOutcome> {
    // A concurrent change (another delivery, the expiry job) makes the guarded update
    // miss: the second pass sees the new status and decides again.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.unitOfWork.run((tx) => this.settleOnce(payment, now, tx));
      } catch (error) {
        if (!(error instanceof SettlementRace)) throw error;
      }
    }
    throw new DomainError("common.conflict");
  }

  /**
   * Asks payOS about the order and settles it when it is paid. `publicCall` (the
   * return page) is throttled; the admin button always asks.
   */
  async reconcile(orderId: string, options: { publicCall: boolean }, now = new Date()) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError("common.not_found");
    if (order.amount === 0 || !order.payment) return order;
    if (
      options.publicCall &&
      (order.status !== "pending" ||
        (order.lastReconciledAt &&
          now.getTime() - order.lastReconciledAt.getTime() < PUBLIC_RECONCILE_INTERVAL_MS))
    ) {
      return order;
    }
    await this.orders.transition(order.id, { statuses: [order.status] }, { lastReconciledAt: now });
    const status = await this.gateway.getStatus(order.orderCode);
    if (status.status === "PAID") {
      const last = status.transactions.at(-1);
      await this.settle(
        {
          orderCode: order.orderCode,
          amount: status.amountPaid,
          reference: last?.reference ?? null,
          paymentLinkId: status.paymentLinkId,
          transactionAt: last?.transactionDateTime ?? null,
          source: "reconcile",
        },
        now,
      );
    }
    return (await this.orders.findById(orderId))!;
  }

  private async settleOnce(
    payment: ConfirmedPayment,
    now: Date,
    tx: TxContext,
  ): Promise<PaymentOutcome> {
    const order = await this.orders.findByOrderCode(payment.orderCode, tx);
    if (!order) {
      // payOS sends a sample transaction when the webhook URL is registered.
      await this.record(payment, "unknown_order", tx);
      return "unknown_order";
    }
    const [event] = await this.events.findByIds([order.eventId]);
    const plan = planSettlement(order, payment.amount, {
      eventCancelled: event?.status === "cancelled",
    });
    switch (plan.kind) {
      case "duplicate":
        await this.record(payment, "duplicate", tx);
        return "duplicate";
      case "amount_mismatch": {
        const flagged = await this.orders.transition(
          order.id,
          { statuses: [order.status] },
          { flags: { amountMismatch: true } },
          tx,
        );
        if (!flagged) throw new SettlementRace();
        await this.record(payment, "amount_mismatch", tx);
        return "amount_mismatch";
      }
      case "convert_hold": {
        const paid = await this.orders.transition(
          order.id,
          { statuses: ["pending"], seatState: "held" },
          { status: "paid", seatState: "sold", paidAt: now },
          tx,
        );
        if (!paid) throw new SettlementRace();
        for (const item of paid.items) {
          if (!(await this.ticketTypes.convertHeld(item.ticketTypeId, item.quantity, tx))) {
            // Counters out of step with the order: never paper over it silently.
            throw new DomainError("common.conflict", "held seats missing for a paid order");
          }
        }
        await this.issue(paid, tx);
        await this.record(payment, "paid", tx);
        return "paid";
      }
      case "retake_seats":
        return this.retakeSeats(order, payment, now, tx);
      case "refund_only": {
        const paid = await this.orders.transition(
          order.id,
          { statuses: ["expired", "cancelled"], seatState: "released" },
          { status: "paid", seatState: "released", paidAt: now, flags: { refundRequired: true } },
          tx,
        );
        if (!paid) throw new SettlementRace();
        await this.record(payment, "refund_required", tx);
        return "refund_required";
      }
    }
  }

  /**
   * Money arrived after the hold ended (expired, or cancelled by the buyer). Seats are
   * taken again if every ticket type still has room; otherwise the order is paid
   * without seats and flagged for a manual refund (shown to admins).
   */
  private async retakeSeats(
    order: OrderRecord,
    payment: ConfirmedPayment,
    now: Date,
    tx: TxContext,
  ): Promise<PaymentOutcome> {
    const taken: OrderRecord["items"] = [];
    for (const item of order.items) {
      if (!(await this.ticketTypes.take(item.ticketTypeId, item.quantity, "sold", tx))) break;
      taken.push(item);
    }
    const allTaken = taken.length === order.items.length;
    if (!allTaken) {
      for (const item of taken) {
        await this.ticketTypes.release(item.ticketTypeId, item.quantity, "sold", tx);
      }
    }
    const paid = await this.orders.transition(
      order.id,
      { statuses: ["expired", "cancelled"], seatState: "released" },
      allTaken
        ? { status: "paid", seatState: "sold", paidAt: now, flags: { latePayment: true } }
        : { status: "paid", seatState: "released", paidAt: now, flags: { refundRequired: true } },
      tx,
    );
    if (!paid) throw new SettlementRace();
    if (allTaken) await this.issue(paid, tx);
    const outcome = allTaken ? "paid" : "refund_required";
    await this.record(payment, outcome, tx);
    return outcome;
  }

  private async issue(order: OrderRecord, tx: TxContext) {
    await issueAndSend(this.tickets, this.outbox, order, tx);
    const [event] = await this.events.findByIds([order.eventId]);
    if (event) {
      await this.outbox.enqueue(tx, { type: REVALIDATE_EVENT_JOB, payload: { slug: event.slug } });
    }
  }

  private record(payment: ConfirmedPayment, outcome: PaymentOutcome, tx: TxContext) {
    return this.paymentEvents.insert(
      {
        orderCode: payment.orderCode,
        source: payment.source,
        amount: payment.amount,
        reference: payment.reference,
        paymentLinkId: payment.paymentLinkId,
        transactionAt: payment.transactionAt,
        outcome,
      },
      tx,
    );
  }
}
