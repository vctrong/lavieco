import { createHmac } from "node:crypto";

import { type DynamicModule, Module } from "@nestjs/common";

import { SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { EVENT_REPOSITORY, type EventRepository } from "../events";
import {
  ORDER_LINKS,
  TICKET_REPOSITORY,
  validateAnswers,
  type OrderLinks,
  type TicketRepository,
} from "../orders";
import { RATE_LIMITER, VouchersModule, type RateLimiter } from "../vouchers";
import { SurveysAdminController, SurveysPublicController } from "./api/surveys.controllers";
import {
  SURVEY_REPOSITORY,
  SURVEY_RESPONSE_REPOSITORY,
  SurveyService,
  type SurveyRepository,
  type SurveyResponseRepository,
} from "./application/survey-service";
import {
  MongoSurveyRepository,
  MongoSurveyResponseRepository,
  surveyPersistence,
} from "./infrastructure/survey.persistence";
import { writeSurveySheet } from "./infrastructure/survey-sheet-writer";
import { SURVEY_SERVICE } from "./surveys.tokens";

@Module({})
export class SurveysModule {
  /** The app's events and orders module instances: a ticket's share token proves who may answer. */
  static forRoot(events: DynamicModule, orders: DynamicModule): DynamicModule {
    return {
      module: SurveysModule,
      imports: [surveyPersistence, events, orders, VouchersModule],
      controllers: [SurveysAdminController, SurveysPublicController],
      providers: [
        { provide: SURVEY_REPOSITORY, useClass: MongoSurveyRepository },
        { provide: SURVEY_RESPONSE_REPOSITORY, useClass: MongoSurveyResponseRepository },
        {
          provide: SURVEY_SERVICE,
          useFactory: (
            surveys: SurveyRepository,
            responses: SurveyResponseRepository,
            links: OrderLinks,
            tickets: TicketRepository,
            limiter: RateLimiter,
            audit: AuditTrail,
            unitOfWork: UnitOfWork,
            env: ProgramEnv,
            events: EventRepository,
          ) =>
            new SurveyService(
              surveys,
              responses,
              async (token) => {
                const ticketId = links.ticketIdOf(token);
                const ticket = ticketId ? await tickets.findById(ticketId) : null;
                if (!ticket || ticket.status === "void" || !links.verifyTicket(token, ticket)) {
                  return null;
                }
                return { ticketId: ticket.id, orderId: ticket.orderId, eventId: ticket.eventId };
              },
              validateAnswers,
              limiter,
              (value) =>
                createHmac("sha256", Buffer.from(env.TICKET_LINK_SECRET, "base64"))
                  .update(`survey-key:${value}`)
                  .digest("base64url"),
              writeSurveySheet,
              audit,
              unitOfWork,
              async (slug) => (await events.findPublicBySlug(slug))?.id ?? null,
            ),
          inject: [
            SURVEY_REPOSITORY,
            SURVEY_RESPONSE_REPOSITORY,
            ORDER_LINKS,
            TICKET_REPOSITORY,
            RATE_LIMITER,
            AUDIT_TRAIL,
            UNIT_OF_WORK,
            SERVICE_CONFIG,
            EVENT_REPOSITORY,
          ],
        },
      ],
      exports: [SURVEY_REPOSITORY, SURVEY_RESPONSE_REPOSITORY],
    };
  }
}
