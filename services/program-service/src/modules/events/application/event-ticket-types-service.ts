import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { TicketTypeCreateRequest, TicketTypeUpdateRequest } from "@lavieco/shared/events";

import {
  assertCanAddTicketType,
  assertTicketTypeChangeAllowed,
  pricingOf,
  toTicketTypeChanges,
  type TicketTypeRecord,
  type TicketTypeRepository,
} from "../../ticketing";
import type { EventRecord } from "../domain/event";
import type { EventRepository } from "./ports/event-repository.port";
import { queueRevalidation } from "./revalidation";

/**
 * Ticket types of one event. Each change recomputes the event's stored pricing in the
 * same transaction and refreshes the public page when it is visible.
 */
export class EventTicketTypesService {
  constructor(
    private readonly events: EventRepository,
    private readonly ticketTypes: TicketTypeRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
  ) {}

  async list(eventId: string): Promise<TicketTypeRecord[]> {
    await this.requireEditableEvent(eventId, { allowEnded: true });
    return this.ticketTypes.listByEvent(eventId);
  }

  async create(eventId: string, input: TicketTypeCreateRequest): Promise<TicketTypeRecord> {
    const event = await this.requireEditableEvent(eventId);
    return this.unitOfWork.run(async (tx) => {
      assertCanAddTicketType(await this.ticketTypes.listByEvent(eventId, tx));
      const created = await this.ticketTypes.insert(eventId, toTicketTypeChanges(input), tx);
      await this.afterChange(event, tx);
      return created;
    });
  }

  async update(
    eventId: string,
    ticketTypeId: string,
    input: TicketTypeUpdateRequest,
  ): Promise<TicketTypeRecord> {
    const event = await this.requireEditableEvent(eventId);
    const current = await this.ticketTypes.findById(ticketTypeId);
    if (!current || current.eventId !== eventId) throw new DomainError("common.not_found");
    const changes = toTicketTypeChanges(input);
    assertTicketTypeChangeAllowed(current, changes);
    return this.unitOfWork.run(async (tx) => {
      const saved = await this.ticketTypes.update(ticketTypeId, input.revision, changes, tx);
      if (!saved) throw new DomainError("common.conflict");
      await this.afterChange(event, tx);
      return saved;
    });
  }

  private async afterChange(event: EventRecord, tx: TxContext) {
    const all = await this.ticketTypes.listByEvent(event.id, tx);
    await this.events.setPricing(event.id, pricingOf(all), tx);
    await queueRevalidation(this.outbox, tx, event);
  }

  private async requireEditableEvent(
    eventId: string,
    options: { allowEnded?: boolean } = {},
  ): Promise<EventRecord> {
    const event = await this.events.findById(eventId);
    if (!event) throw new DomainError("common.not_found");
    // Archive-only events never sell tickets.
    if (event.kind === "past") throw new DomainError("event.past_event_restricted");
    if (event.status === "ended" && !options.allowEnded)
      throw new DomainError("ticket_type.locked");
    return event;
  }
}
