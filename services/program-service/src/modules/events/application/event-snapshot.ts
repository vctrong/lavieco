import type { EventReadiness } from "@lavieco/shared/events";

import { isSelectable, type EventTypeRecord } from "../../event-types";
import { hasRegistrations, visible, type TicketTypeRecord } from "../../ticketing";
import type { EventRecord } from "../domain/event";
import { readinessOf } from "../domain/publish-readiness";

/** Everything the admin needs about one event; mapped to `EventView` by the api layer. */
export type EventSnapshot = {
  event: EventRecord;
  ticketTypes: TicketTypeRecord[];
  hasRegistrations: boolean;
  readiness: EventReadiness;
};

export function snapshotOf(
  event: EventRecord,
  ticketTypes: TicketTypeRecord[],
  type: EventTypeRecord | null,
  now: Date,
): EventSnapshot {
  return {
    event,
    ticketTypes,
    hasRegistrations: hasRegistrations(ticketTypes),
    readiness: readinessOf({
      kind: event.kind,
      content: event,
      visibleTicketTypes: visible(ticketTypes).length,
      typeSelectable: isSelectable(type),
      now,
    }),
  };
}
