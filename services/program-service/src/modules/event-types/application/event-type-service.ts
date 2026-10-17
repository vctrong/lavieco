import { DomainError } from "@lavieco/shared";
import type { EventTypeCreateRequest, EventTypeUpdateRequest } from "@lavieco/shared/events";

import { eventTypeKey, type EventTypeRecord } from "../domain/event-type";
import type { EventTypeRepository } from "./ports/event-type-repository.port";

/** Admin-managed program types, shown in the event form and as public filters. */
export class EventTypeService {
  constructor(private readonly types: EventTypeRepository) {}

  list(includeArchived: boolean): Promise<EventTypeRecord[]> {
    return this.types.list({ includeArchived });
  }

  create(input: EventTypeCreateRequest): Promise<EventTypeRecord> {
    return this.types.insert({
      key: eventTypeKey(input.name),
      name: input.name,
      sortOrder: input.sortOrder,
    });
  }

  async update(id: string, input: EventTypeUpdateRequest, now = new Date()) {
    const current = await this.types.findById(id);
    if (!current) throw new DomainError("common.not_found");
    const updated = await this.types.update(id, input.revision, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.archived !== undefined
        ? { archivedAt: input.archived ? (current.archivedAt ?? now) : null }
        : {}),
    });
    if (!updated) throw new DomainError("common.conflict");
    return updated;
  }
}
