import { DomainError } from "@lavieco/shared";
import type { PublicEventAttendance } from "@lavieco/shared/events";

import { publicStateOf, type EventRepository } from "../../events";
import type { TicketRepository } from "./ports/order-repositories.port";

/**
 * "N người đã tham gia" on the page of an event that has ended. Lives with the orders
 * because the figure comes from the checked-in tickets; an archive-only event has no
 * tickets, so only its typed count once approved is published (BR-09).
 */
export class EventAttendanceService {
  constructor(
    private readonly events: EventRepository,
    private readonly tickets: TicketRepository,
  ) {}

  async bySlug(slug: string, now = new Date()): Promise<PublicEventAttendance> {
    const event = await this.events.findPublicBySlug(slug);
    if (!event) throw new DomainError("common.not_found");
    // Ticket types do not matter once an event is over or cancelled.
    if (publicStateOf(event, [], now) !== "ended") return { attendeeCount: null };
    if (event.kind === "past") {
      const { count, approvedAt } = event.attendance;
      return { attendeeCount: approvedAt !== null ? count : null };
    }
    const { checkedIn } = await this.tickets.countByEvent(event.id);
    // Nobody checked in usually means the door scan was not used: say nothing.
    return { attendeeCount: checkedIn > 0 ? checkedIn : null };
  }
}
