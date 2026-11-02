import type { TxContext } from "@lavieco/service-kit/ports";

import type { EventRepository } from "../../events";
import type { TicketTypeRepository } from "../../ticketing";
import { peopleOf, type OrderItem } from "../domain/order";

export type SeatStores = { ticketTypes: TicketTypeRepository; events: EventRepository };
type Seats = { eventId: string; items: readonly OrderItem[] };

/**
 * Seats move at two levels in the caller's transaction (BR-14, never oversell): units on
 * each ticket type, people on the event's shared capacity. One place, so no path can
 * move one level and forget the other.
 */
export async function takeSeats(
  { ticketTypes, events }: SeatStores,
  { eventId, items }: Seats,
  into: "held" | "sold",
  tx: TxContext,
): Promise<boolean> {
  const taken: OrderItem[] = [];
  for (const item of items) {
    if (!(await ticketTypes.take(item.ticketTypeId, item.quantity, into, tx))) break;
    taken.push(item);
  }
  const fits =
    taken.length === items.length && (await events.takeSeats(eventId, peopleOf(items), into, tx));
  if (fits) return true;
  // The caller may go on in this transaction (a late payment that found no seat).
  for (const item of taken) await ticketTypes.release(item.ticketTypeId, item.quantity, into, tx);
  return false;
}

export async function convertHeldSeats(
  { ticketTypes, events }: SeatStores,
  { eventId, items }: Seats,
  tx: TxContext,
): Promise<boolean> {
  for (const item of items) {
    if (!(await ticketTypes.convertHeld(item.ticketTypeId, item.quantity, tx))) return false;
  }
  await events.convertHeldSeats(eventId, peopleOf(items), tx);
  return true;
}

export async function releaseSeats(
  { ticketTypes, events }: SeatStores,
  { eventId, items }: Seats,
  from: "held" | "sold",
  tx: TxContext,
): Promise<void> {
  for (const item of items) await ticketTypes.release(item.ticketTypeId, item.quantity, from, tx);
  await events.releaseSeats(eventId, peopleOf(items), from, tx);
}
