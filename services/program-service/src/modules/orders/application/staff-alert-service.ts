import type { EventRepository } from "../../events";
import type { StaffAlertSink } from "../../staff-alerts";
import { availabilityOf, type TicketTypeRepository } from "../../ticketing";
import { orderAlert, seatAlert, type StaffAlertReason } from "../domain/staff-alerts";
import type { OrderRepository } from "./ports/order-repositories.port";

/**
 * Turns an `order.alert_staff` job into Web Push alerts (ADR-0027): the order itself,
 * then, for a confirmed order, "few seats left" / "sold out" once per event. Runs in the
 * outbox: a failure is retried, and identity-service drops the alerts already sent.
 */
export class StaffAlertService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly sink: StaffAlertSink,
  ) {}

  async alert(orderId: string, reason: StaffAlertReason, now = new Date()): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) return;
    const [event] = await this.events.findByIds([order.eventId]);
    if (!event) return;
    await this.sink.send(orderAlert(order, event.title, reason));
    if (reason !== "confirmed") return;

    const availability = availabilityOf(await this.ticketTypes.listByEvent(event.id), event);
    const kind = availability.soldOut
      ? "sold_out"
      : availability.seatsLeft !== null
        ? "few_left"
        : null;
    if (!kind) return;
    // Claimed first so concurrent orders alert once; released if the send fails, so the
    // retry (or the next order) sends it.
    if (!(await this.events.claimSeatAlert(event.id, kind, now))) return;
    try {
      await this.sink.send(seatAlert(event, kind, availability.seatsLeft));
    } catch (error) {
      await this.events.releaseSeatAlert(event.id, kind);
      throw error;
    }
  }
}
