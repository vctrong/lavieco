import type { TxContext } from "@lavieco/service-kit/ports";

import type { TicketTypeChanges, TicketTypeRecord } from "../../domain/ticket-type";

export const TICKET_TYPE_REPOSITORY = Symbol("TICKET_TYPE_REPOSITORY");

export interface TicketTypeRepository {
  listByEvent(eventId: string, tx?: TxContext): Promise<TicketTypeRecord[]>;
  listByEvents(eventIds: string[]): Promise<Map<string, TicketTypeRecord[]>>;
  findById(id: string): Promise<TicketTypeRecord | null>;
  insert(eventId: string, input: TicketTypeChanges, tx?: TxContext): Promise<TicketTypeRecord>;
  /** Optimistic lock on `revision`; null when it no longer matches. Never touches counters. */
  update(
    id: string,
    revision: number,
    changes: TicketTypeChanges,
    tx?: TxContext,
  ): Promise<TicketTypeRecord | null>;

  /**
   * Seat counters, only ever moved by atomic conditional `$inc` inside an order
   * transaction (BR-14: never oversell). `take` adds `quantity` to `held` (seat hold)
   * or `sold` (free order, late payment) only if `sold + held + quantity <= quantity`
   * (always for an unlimited type). Each returns false when its condition fails.
   */
  take(id: string, quantity: number, into: "held" | "sold", tx: TxContext): Promise<boolean>;
  /** A paid hold: `held -= quantity`, `sold += quantity`. */
  convertHeld(id: string, quantity: number, tx: TxContext): Promise<boolean>;
  /** Gives seats back from `held` or `sold` (expiry, cancellation, refund). */
  release(id: string, quantity: number, from: "held" | "sold", tx: TxContext): Promise<boolean>;
}
