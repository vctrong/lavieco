import type { PublicEventState } from "@lavieco/shared/events";

import { availabilityOf, type TicketTypeRecord } from "../../ticketing";
import type { EventRecord } from "./event";
import { registrationBlocker, type BookableEvent } from "./registration";

type StatefulEvent = BookableEvent & Pick<EventRecord, "endAt">;

/**
 * The one place that decides what a public page shows about an event (badge, main
 * button, booking parts): the web never guesses it from dates or counters.
 * Order matters: cancelled, then over, then closed by the team, then why booking is
 * not possible, then "few seats left".
 */
export function publicStateOf(
  event: StatefulEvent,
  visibleTicketTypes: readonly TicketTypeRecord[],
  now: Date,
): PublicEventState {
  if (event.status === "cancelled") return "cancelled";
  // An event whose end has passed is over even before an admin presses "Kết thúc".
  if (event.kind === "past" || event.status === "ended" || event.endAt <= now) return "ended";
  if (event.status === "closed") return "closed";
  switch (registrationBlocker(event, visibleTicketTypes, now)) {
    case null:
      return availabilityOf(visibleTicketTypes).seatsLeft === null ? "open" : "few_left";
    case "sold_out":
      return "sold_out";
    case "sale_not_started":
      return "upcoming_sale";
    case "online_link_pending":
      return "online_link_pending";
    case "sale_ended":
    case "event_started":
    case "not_open":
      return "closed";
  }
}
