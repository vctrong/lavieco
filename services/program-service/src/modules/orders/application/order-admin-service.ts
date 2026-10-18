import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { OrderListQuery, OrderRefundRequest } from "@lavieco/shared/events";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import { REVALIDATE_EVENT_JOB, type EventRecord, type EventRepository } from "../../events";
import type { TicketTypeRepository } from "../../ticketing";
import { assertRefundable, type OrderAnswer, type OrderRecord } from "../domain/order";
import type { TicketRecord } from "../domain/ticket";
import type { OrderSettlementService } from "./order-settlement-service";
import { SEND_TICKETS_JOB } from "./order-jobs";
import type {
  OrderAnswerRepository,
  OrderRepository,
  PaymentEventRecord,
  PaymentEventRepository,
  TicketRepository,
} from "./ports/order-repositories.port";

export type StaffActor = { userId: string; roles: readonly Role[]; requestId: string | null };

export type AdminOrderDetail = {
  order: OrderRecord;
  event: EventRecord;
  tickets: TicketRecord[];
  answers: OrderAnswer[];
  payments: PaymentEventRecord[];
};

/**
 * Orders for the team (docs/05 §5.7): list, detail, "Kiểm tra lại thanh toán",
 * "Gửi lại vé" and "Đánh dấu đã hoàn tiền". Refunds are bank transfers done by hand
 * (BR-15): this only records them, voids the tickets and gives the seats back.
 */
export class OrderAdminService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly answers: OrderAnswerRepository,
    private readonly tickets: TicketRepository,
    private readonly paymentEvents: PaymentEventRepository,
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly settlement: OrderSettlementService,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  async list(query: OrderListQuery) {
    const page = await this.orders.listAdmin(query);
    const events = await this.eventsById(page.items.map((order) => order.eventId));
    return {
      items: page.items.map((order) => ({ order, event: events.get(order.eventId) ?? null })),
      nextCursor: page.nextCursor,
    };
  }

  async detail(orderId: string): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError("common.not_found");
    const [[event], tickets, answers, payments] = await Promise.all([
      this.events.findByIds([order.eventId]),
      this.tickets.listByOrder(order.id),
      this.answers.findByOrders([order.id]),
      this.paymentEvents.listByOrderCode(order.orderCode),
    ]);
    if (!event) throw new DomainError("common.not_found");
    return { order, event, tickets, answers: answers.get(order.id) ?? [], payments };
  }

  /** Asks payOS and settles through the same idempotent path as the webhook. */
  async reconcile(orderId: string): Promise<AdminOrderDetail> {
    await this.settlement.reconcile(orderId, { publicCall: false });
    return this.detail(orderId);
  }

  async resendTickets(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError("common.not_found");
    if (order.status !== "paid" || order.seatState !== "sold") {
      throw new DomainError("order.invalid_state");
    }
    await this.unitOfWork.run((tx) =>
      this.outbox.enqueue(tx, { type: SEND_TICKETS_JOB, payload: { orderId, resend: true } }),
    );
  }

  /** Step-up is checked by the controller before this runs (ADR-0021). */
  async markRefunded(
    orderId: string,
    input: OrderRefundRequest,
    actor: StaffActor,
    now = new Date(),
  ): Promise<AdminOrderDetail> {
    const current = await this.orders.findById(orderId);
    if (!current) throw new DomainError("common.not_found");
    assertRefundable(current);
    await this.unitOfWork.run(async (tx) => {
      const refunded = await this.orders.transition(
        orderId,
        { statuses: ["paid"], seatState: current.seatState, revision: input.revision },
        { status: "refunded", seatState: "released", refundedAt: now, refundNote: input.note },
        tx,
      );
      if (!refunded) throw new DomainError("common.conflict");
      await this.tickets.voidByOrder(orderId, now, tx);
      // A late payment that found no seat (refund required) holds none to give back.
      if (current.seatState === "sold") {
        for (const item of current.items) {
          await this.ticketTypes.release(item.ticketTypeId, item.quantity, "sold", tx);
        }
      }
      await this.audit.record(
        tx,
        {
          action: "order.refund",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "order", id: orderId },
          requestId: actor.requestId,
          meta: { orderCode: current.orderCode, amount: current.amount },
        },
        now,
      );
      const [event] = await this.events.findByIds([current.eventId]);
      if (event) {
        await this.outbox.enqueue(tx, {
          type: REVALIDATE_EVENT_JOB,
          payload: { slug: event.slug },
        });
      }
    });
    return this.detail(orderId);
  }

  private async eventsById(ids: string[]) {
    const events = await this.events.findByIds([...new Set(ids)]);
    return new Map(events.map((event) => [event.id, event]));
  }
}
