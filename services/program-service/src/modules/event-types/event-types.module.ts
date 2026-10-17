import { Module } from "@nestjs/common";

import { EventTypesAdminController } from "./api/event-types-admin.controller";
import { EventTypesPublicController } from "./api/event-types-public.controller";
import { EventTypeService } from "./application/event-type-service";
import {
  EVENT_TYPE_REPOSITORY,
  type EventTypeRepository,
} from "./application/ports/event-type-repository.port";
import { EVENT_TYPE_SERVICE } from "./event-types.tokens";
import { eventTypePersistence } from "./infrastructure/event-type.model";
import { MongoEventTypeRepository } from "./infrastructure/event-type.repository";

@Module({
  imports: [eventTypePersistence],
  controllers: [EventTypesAdminController, EventTypesPublicController],
  providers: [
    { provide: EVENT_TYPE_REPOSITORY, useClass: MongoEventTypeRepository },
    {
      provide: EVENT_TYPE_SERVICE,
      useFactory: (types: EventTypeRepository) => new EventTypeService(types),
      inject: [EVENT_TYPE_REPOSITORY],
    },
  ],
  exports: [EVENT_TYPE_REPOSITORY, EVENT_TYPE_SERVICE],
})
export class EventTypesModule {}
