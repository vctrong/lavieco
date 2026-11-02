import { DomainError } from "@lavieco/shared";
import {
  EVENT_LIMITS,
  type EventPricing,
  type PublicAvailability,
  type PublicPriceRange,
  type TicketTypeInput,
} from "@lavieco/shared/events";

/** `ticket_types` (docs/03 §9.2). `sold`/`held` move with orders from Phase 3 on. */
export type TicketTypeRecord = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  price: number;
  quantity: number | null;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  maxPerOrder: number;
  /** People per unit. `quantity`, `sold`, `held` and `price` count units. */
  seatsPerUnit: number;
  sortOrder: number;
  hidden: boolean;
  sold: number;
  held: number;
  revision: number;
};

export type TicketTypeChanges = Omit<
  TicketTypeRecord,
  "id" | "eventId" | "sold" | "held" | "revision"
>;

export function toTicketTypeChanges(input: TicketTypeInput): TicketTypeChanges {
  return {
    name: input.name,
    description: input.description,
    price: input.price,
    quantity: input.quantity,
    saleStartAt: input.saleStartAt ? new Date(input.saleStartAt) : null,
    saleEndAt: input.saleEndAt ? new Date(input.saleEndAt) : null,
    maxPerOrder: input.maxPerOrder,
    seatsPerUnit: input.seatsPerUnit,
    sortOrder: input.sortOrder,
    hidden: input.hidden,
  };
}

const taken = (ticketType: TicketTypeRecord) => ticketType.sold + ticketType.held;

/** Someone holds or bought a seat: the event "has registrations" (BR-17). */
export function hasRegistrations(ticketTypes: readonly TicketTypeRecord[]): boolean {
  return ticketTypes.some((ticketType) => taken(ticketType) > 0);
}

/**
 * Once seats are taken, the price and the people per unit are frozen and the quantity cannot drop below what
 * is taken; a ticket type is hidden rather than removed.
 */
export function assertTicketTypeChangeAllowed(
  current: TicketTypeRecord,
  next: TicketTypeChanges,
): void {
  const used = taken(current);
  if (used > 0 && next.price !== current.price) throw new DomainError("ticket_type.locked");
  if (used > 0 && next.seatsPerUnit !== current.seatsPerUnit) {
    throw new DomainError("ticket_type.locked");
  }
  if (next.quantity !== null && next.quantity < used) throw new DomainError("ticket_type.locked");
}

export function assertCanAddTicketType(existing: readonly TicketTypeRecord[]): void {
  if (existing.length >= EVENT_LIMITS.ticketTypesMax) {
    throw new DomainError("ticket_type.limit_reached");
  }
}

export const visible = (ticketTypes: readonly TicketTypeRecord[]) =>
  ticketTypes.filter((ticketType) => !ticketType.hidden);

/** Inside its sale window (open bounds when not set). */
export function isOnSale(ticketType: TicketTypeRecord, now: Date): boolean {
  if (ticketType.saleStartAt !== null && ticketType.saleStartAt > now) return false;
  if (ticketType.saleEndAt !== null && ticketType.saleEndAt <= now) return false;
  return true;
}

/** The event's shared limit, in people; `capacity` null = none. */
export type EventSeatCounters = { capacity: number | null; seatsSold: number; seatsHeld: number };
export const NO_SHARED_CAPACITY: EventSeatCounters = { capacity: null, seatsSold: 0, seatsHeld: 0 };

const smallest = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.min(a, b);

/** People the event can still take; `null` without a shared capacity. */
export function eventSeatsLeft(event: EventSeatCounters): number | null {
  if (event.capacity === null) return null;
  return Math.max(0, event.capacity - event.seatsSold - event.seatsHeld);
}

/** Units that can still be bought, limited by the type AND the event; `null` = no limit. */
export function unitsLeftOf(
  ticketType: TicketTypeRecord,
  event: EventSeatCounters = NO_SHARED_CAPACITY,
): number | null {
  const own =
    ticketType.quantity === null ? null : Math.max(0, ticketType.quantity - taken(ticketType));
  const shared = eventSeatsLeft(event);
  const byEvent = shared === null ? null : Math.floor(shared / ticketType.seatsPerUnit);
  return smallest(own, byEvent);
}

/** People this type can still seat, `null` = no limit. */
export function seatsLeftOf(
  ticketType: TicketTypeRecord,
  event: EventSeatCounters = NO_SHARED_CAPACITY,
): number | null {
  const units = unitsLeftOf(ticketType, event);
  return units === null ? null : units * ticketType.seatsPerUnit;
}

/**
 * `isFree` = EVERY visible ticket type costs 0 (docs/03 §9.2, since 22/10/2026: an
 * event with a free and a paid ticket is not "free"); `priceFrom` is the lowest
 * visible price. Stored on the event so the public list can filter on it.
 */
export function pricingOf(ticketTypes: readonly TicketTypeRecord[]): EventPricing {
  const range = priceRangeOf(ticketTypes);
  if (!range) return { isFree: false, priceFrom: null };
  return { isFree: range.max === 0, priceFrom: range.min };
}

/** Lowest and highest visible price ("Từ X" only when they differ); null without tickets. */
export function priceRangeOf(ticketTypes: readonly TicketTypeRecord[]): PublicPriceRange | null {
  const prices = visible(ticketTypes).map((ticketType) => ticketType.price);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * "Sắp hết chỗ": at most `fewSeatsRatio` of the capacity left, or at most
 * `fewSeatsMin` seats, whichever allows more (docs/05, 22/10/2026).
 */
export function isFewSeats(remaining: number, capacity: number): boolean {
  if (remaining <= 0) return false;
  const threshold = Math.max(
    EVENT_LIMITS.fewSeatsMin,
    Math.floor(capacity * EVENT_LIMITS.fewSeatsRatio),
  );
  return remaining <= threshold;
}

/**
 * Public seat information: nothing for unlimited quantities, "X left" only when few
 * seats remain (`isFewSeats`), and sold out at 0 (raw counters stay private).
 */
export function availabilityOf(
  ticketTypes: readonly TicketTypeRecord[],
  event: EventSeatCounters = NO_SHARED_CAPACITY,
): PublicAvailability {
  const shown = visible(ticketTypes);
  if (shown.length === 0) return { soldOut: false, seatsLeft: null };
  const unlimited = shown.some((ticketType) => ticketType.quantity === null);
  const ownLeft = unlimited
    ? null
    : shown.reduce(
        (sum, ticketType) =>
          sum +
          Math.max(0, (ticketType.quantity ?? 0) - taken(ticketType)) * ticketType.seatsPerUnit,
        0,
      );
  const remaining = smallest(ownLeft, eventSeatsLeft(event));
  // A last seat is no use to a 2-person combo: sold out means no type can still be bought.
  const soldOut = shown.every((ticketType) => unitsLeftOf(ticketType, event) === 0);
  if (remaining === null) return { soldOut, seatsLeft: null };
  const capacity = smallest(capacityOf(shown), event.capacity) ?? 0;
  return { soldOut, seatsLeft: isFewSeats(remaining, capacity) ? remaining : null };
}

/** People all these types seat together; `null` when one of them is unlimited. */
function capacityOf(ticketTypes: readonly TicketTypeRecord[]): number | null {
  if (ticketTypes.some((ticketType) => ticketType.quantity === null)) return null;
  return ticketTypes.reduce(
    (sum, ticketType) => sum + (ticketType.quantity ?? 0) * ticketType.seatsPerUnit,
    0,
  );
}

/** Admin list column: people sold over capacity (`null` capacity = unlimited). */
export function seatsOf(
  ticketTypes: readonly TicketTypeRecord[],
  event: EventSeatCounters = NO_SHARED_CAPACITY,
) {
  const shown = visible(ticketTypes);
  const sold = shown.reduce(
    (sum, ticketType) => sum + ticketType.sold * ticketType.seatsPerUnit,
    0,
  );
  const own = shown.length === 0 ? null : capacityOf(shown);
  return { sold, capacity: smallest(own, event.capacity) };
}
