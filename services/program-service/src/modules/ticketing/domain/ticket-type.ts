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
 * Once seats are taken, the price is frozen and the quantity cannot drop below what
 * is taken; a ticket type is hidden rather than removed.
 */
export function assertTicketTypeChangeAllowed(
  current: TicketTypeRecord,
  next: TicketTypeChanges,
): void {
  const used = taken(current);
  if (used > 0 && next.price !== current.price) throw new DomainError("ticket_type.locked");
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

/** Seats still available, `null` for an unlimited type. */
export function seatsLeftOf(ticketType: TicketTypeRecord): number | null {
  if (ticketType.quantity === null) return null;
  return Math.max(0, ticketType.quantity - taken(ticketType));
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
export function availabilityOf(ticketTypes: readonly TicketTypeRecord[]): PublicAvailability {
  const shown = visible(ticketTypes);
  if (shown.length === 0 || shown.some((ticketType) => ticketType.quantity === null)) {
    return { soldOut: false, seatsLeft: null };
  }
  const remaining = shown.reduce(
    (sum, ticketType) => sum + Math.max(0, (ticketType.quantity ?? 0) - taken(ticketType)),
    0,
  );
  const capacity = shown.reduce((sum, ticketType) => sum + (ticketType.quantity ?? 0), 0);
  return {
    soldOut: remaining === 0,
    seatsLeft: isFewSeats(remaining, capacity) ? remaining : null,
  };
}

/** Admin list column: seats sold over capacity (`null` capacity = unlimited). */
export function seatsOf(ticketTypes: readonly TicketTypeRecord[]) {
  const shown = visible(ticketTypes);
  const sold = shown.reduce((sum, ticketType) => sum + ticketType.sold, 0);
  const capacity = shown.some((ticketType) => ticketType.quantity === null)
    ? null
    : shown.length === 0
      ? null
      : shown.reduce((sum, ticketType) => sum + (ticketType.quantity ?? 0), 0);
  return { sold, capacity };
}
