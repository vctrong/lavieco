import { DomainError } from "@lavieco/shared";
import {
  EVENT_LIMITS,
  type EventPricing,
  type PublicAvailability,
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
 * `isFree` = at least one visible ticket type costs 0 (docs/03 §9.2); `priceFrom` is
 * the lowest visible price. Stored on the event so the public list can filter on it.
 */
export function pricingOf(ticketTypes: readonly TicketTypeRecord[]): EventPricing {
  const prices = visible(ticketTypes).map((ticketType) => ticketType.price);
  if (prices.length === 0) return { isFree: false, priceFrom: null };
  const priceFrom = Math.min(...prices);
  return { isFree: priceFrom === 0, priceFrom };
}

/**
 * Public seat information: nothing for unlimited quantities, "X left" only at or
 * below the threshold, and sold out at 0 (raw counters stay private).
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
  return {
    soldOut: remaining === 0,
    seatsLeft: remaining > 0 && remaining <= EVENT_LIMITS.fewSeatsThreshold ? remaining : null,
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
