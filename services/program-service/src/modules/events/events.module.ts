import { type DynamicModule, Module } from "@nestjs/common";

import { OUTBOX_PORT, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import { EVENT_TYPE_REPOSITORY, EventTypesModule, type EventTypeRepository } from "../event-types";
import { TICKET_TYPE_REPOSITORY, TicketingModule, type TicketTypeRepository } from "../ticketing";
import type { ProgramEnv } from "../../config/env";
import { EventsAdminController } from "./api/events-admin.controller";
import { EventsPublicController } from "./api/events-public.controller";
import { EventAdminService } from "./application/event-admin-service";
import { EventPublicService } from "./application/event-public-service";
import { EventTicketTypesService } from "./application/event-ticket-types-service";
import { EVENT_REPOSITORY, type EventRepository } from "./application/ports/event-repository.port";
import {
  MEDIA_ATTACHMENTS,
  type MediaAttachments,
} from "./application/ports/media-attachments.port";
import {
  PREVIEW_TOKEN_REPOSITORY,
  type PreviewTokenRepository,
} from "./application/ports/preview-token-repository.port";
import {
  EVENT_ADMIN_SERVICE,
  EVENT_PUBLIC_SERVICE,
  EVENT_TICKET_TYPES_SERVICE,
} from "./events.tokens";
import { createContentMediaAttachments } from "./infrastructure/content-media-attachments";
import { eventPersistence } from "./infrastructure/event.model";
import { MongoEventRepository } from "./infrastructure/event.repository";
import { MongoPreviewTokenRepository } from "./infrastructure/preview-token.repository";

const providers = [
  { provide: EVENT_REPOSITORY, useClass: MongoEventRepository },
  { provide: PREVIEW_TOKEN_REPOSITORY, useClass: MongoPreviewTokenRepository },
  {
    provide: EVENT_ADMIN_SERVICE,
    useFactory: (
      events: EventRepository,
      ticketTypes: TicketTypeRepository,
      types: EventTypeRepository,
      previewTokens: PreviewTokenRepository,
      unitOfWork: UnitOfWork,
      outbox: OutboxPort,
      media: MediaAttachments,
    ) =>
      new EventAdminService(events, ticketTypes, types, previewTokens, unitOfWork, outbox, media),
    inject: [
      EVENT_REPOSITORY,
      TICKET_TYPE_REPOSITORY,
      EVENT_TYPE_REPOSITORY,
      PREVIEW_TOKEN_REPOSITORY,
      UNIT_OF_WORK,
      OUTBOX_PORT,
      MEDIA_ATTACHMENTS,
    ],
  },
  {
    provide: EVENT_TICKET_TYPES_SERVICE,
    useFactory: (
      events: EventRepository,
      ticketTypes: TicketTypeRepository,
      unitOfWork: UnitOfWork,
      outbox: OutboxPort,
    ) => new EventTicketTypesService(events, ticketTypes, unitOfWork, outbox),
    inject: [EVENT_REPOSITORY, TICKET_TYPE_REPOSITORY, UNIT_OF_WORK, OUTBOX_PORT],
  },
  {
    provide: EVENT_PUBLIC_SERVICE,
    useFactory: (
      events: EventRepository,
      ticketTypes: TicketTypeRepository,
      types: EventTypeRepository,
      previewTokens: PreviewTokenRepository,
    ) => new EventPublicService(events, ticketTypes, types, previewTokens),
    inject: [
      EVENT_REPOSITORY,
      TICKET_TYPE_REPOSITORY,
      EVENT_TYPE_REPOSITORY,
      PREVIEW_TOKEN_REPOSITORY,
    ],
  },
];

@Module({})
export class EventsModule {
  /** `mediaAttachments` lets tests replace content-service with a fake. */
  static forRoot(mediaAttachments?: MediaAttachments): DynamicModule {
    return {
      module: EventsModule,
      imports: [eventPersistence, EventTypesModule, TicketingModule],
      controllers: [EventsAdminController, EventsPublicController],
      providers: [
        ...providers,
        mediaAttachments
          ? { provide: MEDIA_ATTACHMENTS, useValue: mediaAttachments }
          : {
              provide: MEDIA_ATTACHMENTS,
              useFactory: (env: ProgramEnv) =>
                createContentMediaAttachments({
                  contentServiceUrl: env.CONTENT_SERVICE_URL,
                  privateJwk: env.SERVICE_TOKEN_PRIVATE_JWK,
                }),
              inject: [SERVICE_CONFIG],
            },
      ],
      exports: [MEDIA_ATTACHMENTS],
    };
  }
}
