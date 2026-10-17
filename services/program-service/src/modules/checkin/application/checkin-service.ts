import type { CheckinRequest, CheckinResponse } from "@lavieco/shared/events";

import type { OrderRepository, TicketRecord, TicketRepository } from "../../orders";

/**
 * Door check-in (docs/05 §5.6, BR-16): `valid → used` once, atomically, for the event
 * being scanned. A second scan answers "already used" with the first time (not an
 * error); a void ticket, another event's ticket or an unpaid order is "invalid".
 */
export class CheckinService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly orders: OrderRepository,
  ) {}

  async checkIn(
    input: CheckinRequest,
    staffId: string,
    now = new Date(),
  ): Promise<CheckinResponse> {
    const ticket = input.qrToken
      ? await this.tickets.findByQrToken(input.qrToken)
      : await this.tickets.findByCode(input.code!);
    const order = ticket ? await this.orders.findById(ticket.orderId) : null;
    const stats = () => this.tickets.countByEvent(input.eventId);

    if (!ticket || !order || ticket.eventId !== input.eventId || order.status !== "paid") {
      return { result: "invalid", ticket: null, stats: await stats() };
    }
    const view = (current: TicketRecord) => ({
      code: current.code,
      ticketTypeName: current.ticketTypeName,
      buyerName: order.buyer.fullName,
      checkedInAt: current.checkedInAt ? current.checkedInAt.toISOString() : null,
    });
    if (ticket.status === "void") return { result: "invalid", ticket: null, stats: await stats() };
    if (ticket.status === "used") {
      return { result: "already_used", ticket: view(ticket), stats: await stats() };
    }

    const used = await this.tickets.checkIn(ticket.id, input.eventId, staffId, now);
    if (used) return { result: "valid", ticket: view(used), stats: await stats() };
    // Someone scanned the same ticket at the same moment: report their check-in.
    const again = input.qrToken
      ? await this.tickets.findByQrToken(input.qrToken)
      : await this.tickets.findByCode(input.code!);
    if (again?.status === "used") {
      return { result: "already_used", ticket: view(again), stats: await stats() };
    }
    return { result: "invalid", ticket: null, stats: await stats() };
  }

  stats(eventId: string) {
    return this.tickets.countByEvent(eventId);
  }
}
