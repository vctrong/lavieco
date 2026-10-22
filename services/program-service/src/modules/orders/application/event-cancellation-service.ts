import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { EventCancelImpact, EventCancelRequest } from "@lavieco/shared/events";

import type { AuditTrail } from "../../audit";
import {
  assertCancellable,
  queueRevalidation,
  type EventRecord,
  type EventRepository,
} from "../../events";
import type { TicketTypeRepository } from "../../ticketing";
import type { OrderRecord } from "../domain/order";
import type { StaffActor } from "./order-admin-service";
import { CANCEL_PAYMENT_LINK_JOB, SEND_EVENT_CANCELLED_JOB } from "./order-jobs";
import type { OrderRepository, TicketRepository } from "./ports/order-repositories.port";

/**
 * "Huỷ chương trình" (decision of 22/10/2026). Lives with the orders because it settles
 * them; the event itself only changes status. In ONE transaction:
 * - pending orders are cancelled, their held seats go back, payOS links are cancelled
 *   (outbox); a payment that still arrives is settled as refund-only (`planSettlement`);
 * - paid orders keep their status, every ticket is voided (check-in refuses it) and a
 *   paid amount is flagged `refundRequired`: refunds stay manual (BR-15);
 * - every buyer with a paid order gets a cancellation email (outbox, ids only);
 * - the event becomes `cancelled` (final) with its public reason; audited.
 * The controller requires `program:write` and a step-up (ADR-0021).
 */
export class EventCancellationService {
  constructor(
    private readonly events: EventRepository,
    private readonly orders: OrderRepository,
    private readonly tickets: TicketRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  /** What a cancellation would touch, shown in the confirmation dialog. */
  async impact(eventId: string): Promise<EventCancelImpact> {
    await this.requireEvent(eventId);
    const open = await this.orders.listOpenByEvent(eventId);
    const paid = open.filter((order) => order.status === "paid");
    const { total } = await this.tickets.countByEvent(eventId);
    return {
      paidOrders: paid.length,
      pendingOrders: open.length - paid.length,
      validTickets: total,
    };
  }

  async cancel(
    eventId: string,
    input: EventCancelRequest,
    actor: StaffActor,
    now = new Date(),
  ): Promise<EventRecord> {
    return this.unitOfWork.run(async (tx) => {
      const event = await this.events.findById(eventId, tx);
      if (!event) throw new DomainError("common.not_found");
      assertCancellable(event, now);
      if (event.revision !== input.revision) throw new DomainError("common.conflict");

      const open = await this.orders.listOpenByEvent(eventId, tx);
      let pending = 0;
      let paid = 0;
      for (const order of open) {
        if (order.status === "pending") {
          await this.cancelPending(order, now, tx);
          pending += 1;
        } else {
          await this.settlePaid(order, now, tx);
          paid += 1;
        }
      }

      const saved = await this.events.changeStatus(
        eventId,
        input.revision,
        {
          to: "cancelled",
          history: { from: event.status, to: "cancelled", at: now, by: actor.userId },
          publishedAt: event.publishedAt,
          firstPublish: false,
          cancellation: { reason: input.reason, at: now, by: actor.userId },
        },
        { userId: actor.userId },
        tx,
      );
      if (!saved) throw new DomainError("common.conflict");
      await this.audit.record(
        tx,
        {
          action: "event.cancel",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "event", id: eventId },
          requestId: actor.requestId,
          // Counts only: the reason is public on the event, never personal data here.
          meta: { paidOrders: paid, pendingOrders: pending },
        },
        now,
      );
      await queueRevalidation(this.outbox, tx, saved, { force: true });
      return saved;
    });
  }

  private async cancelPending(order: OrderRecord, now: Date, tx: TxContext) {
    const cancelled = await this.orders.transition(
      order.id,
      { statuses: ["pending"], seatState: "held" },
      { status: "cancelled", seatState: "released", cancelledAt: now },
      tx,
    );
    if (!cancelled) throw new DomainError("common.conflict");
    for (const item of order.items) {
      await this.ticketTypes.release(item.ticketTypeId, item.quantity, "held", tx);
    }
    if (order.payment) {
      await this.outbox.enqueue(tx, {
        type: CANCEL_PAYMENT_LINK_JOB,
        payload: { orderId: order.id },
      });
    }
  }

  private async settlePaid(order: OrderRecord, now: Date, tx: TxContext) {
    // A free order has nothing to give back; a paid amount waits for a manual refund.
    if (order.amount > 0) {
      const flagged = await this.orders.transition(
        order.id,
        { statuses: ["paid"] },
        { flags: { refundRequired: true } },
        tx,
      );
      if (!flagged) throw new DomainError("common.conflict");
    }
    await this.tickets.voidByOrder(order.id, now, tx);
    await this.outbox.enqueue(tx, {
      type: SEND_EVENT_CANCELLED_JOB,
      payload: { orderId: order.id },
    });
  }

  private async requireEvent(id: string) {
    const event = await this.events.findById(id);
    if (!event) throw new DomainError("common.not_found");
    return event;
  }
}
