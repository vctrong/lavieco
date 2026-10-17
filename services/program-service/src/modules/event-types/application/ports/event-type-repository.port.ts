import type { LocalizedText } from "@lavieco/shared";

import type { EventTypeRecord } from "../../domain/event-type";

export const EVENT_TYPE_REPOSITORY = Symbol("EVENT_TYPE_REPOSITORY");

export interface EventTypeRepository {
  list(options: { includeArchived: boolean }): Promise<EventTypeRecord[]>;
  findById(id: string): Promise<EventTypeRecord | null>;
  findByIds(ids: string[]): Promise<EventTypeRecord[]>;
  /** Throws `event_type.name_taken` when the derived key already exists. */
  insert(input: { key: string; name: LocalizedText; sortOrder: number }): Promise<EventTypeRecord>;
  /** Optimistic lock on `revision`; null when the revision no longer matches. */
  update(
    id: string,
    revision: number,
    changes: { name?: LocalizedText; sortOrder?: number; archivedAt?: Date | null },
  ): Promise<EventTypeRecord | null>;
}
