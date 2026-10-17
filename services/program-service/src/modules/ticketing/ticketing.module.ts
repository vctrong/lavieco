import { Module } from "@nestjs/common";

import { TICKET_TYPE_REPOSITORY } from "./application/ports/ticket-type-repository.port";
import { ticketTypePersistence } from "./infrastructure/ticket-type.model";
import { MongoTicketTypeRepository } from "./infrastructure/ticket-type.repository";

/**
 * Ticket types and their seat rules. Admin use cases live in `events`, which owns
 * the event they belong to; seat holding arrives here with checkout (Phase 3).
 */
@Module({
  imports: [ticketTypePersistence],
  providers: [{ provide: TICKET_TYPE_REPOSITORY, useClass: MongoTicketTypeRepository }],
  exports: [TICKET_TYPE_REPOSITORY],
})
export class TicketingModule {}
