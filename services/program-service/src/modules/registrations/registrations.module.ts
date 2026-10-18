import { type DynamicModule, Module } from "@nestjs/common";

import { UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { EVENT_REPOSITORY, type EventRepository } from "../events";
import {
  ORDER_ANSWER_REPOSITORY,
  ORDER_REPOSITORY,
  TICKET_REPOSITORY,
  type OrderAnswerRepository,
  type OrderRepository,
  type TicketRepository,
} from "../orders";
import { RegistrationsController } from "./api/registrations.controller";
import { RegistrationsService } from "./application/registrations-service";
import { ExcelWorkbookWriter } from "./infrastructure/excel-workbook-writer";
import { REGISTRATIONS_SERVICE } from "./registrations.tokens";

@Module({})
export class RegistrationsModule {
  /** The app's events and orders module instances (dynamic, shared). */
  static forRoot(events: DynamicModule, orders: DynamicModule): DynamicModule {
    return {
      module: RegistrationsModule,
      imports: [events, orders],
      controllers: [RegistrationsController],
      providers: [
        {
          provide: REGISTRATIONS_SERVICE,
          useFactory: (
            eventRepository: EventRepository,
            orderRepository: OrderRepository,
            tickets: TicketRepository,
            answers: OrderAnswerRepository,
            audit: AuditTrail,
            unitOfWork: UnitOfWork,
          ) =>
            new RegistrationsService(
              eventRepository,
              orderRepository,
              tickets,
              answers,
              new ExcelWorkbookWriter(),
              audit,
              unitOfWork,
            ),
          inject: [
            EVENT_REPOSITORY,
            ORDER_REPOSITORY,
            TICKET_REPOSITORY,
            ORDER_ANSWER_REPOSITORY,
            AUDIT_TRAIL,
            UNIT_OF_WORK,
          ],
        },
      ],
    };
  }
}
