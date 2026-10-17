import type { EventType, PublicEventType } from "@lavieco/shared/events";

import type { EventTypeRecord } from "../domain/event-type";

export function toEventTypeDto(record: EventTypeRecord): EventType {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    sortOrder: record.sortOrder,
    archived: record.archivedAt !== null,
    revision: record.revision,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toPublicEventTypeDto(record: EventTypeRecord): PublicEventType {
  return { id: record.id, key: record.key, name: record.name };
}
