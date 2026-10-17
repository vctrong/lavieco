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
}
