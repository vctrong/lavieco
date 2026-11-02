import { type DynamicModule, Module } from "@nestjs/common";

import { EMAIL_SENDER, SERVICE_CONFIG, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { EmailSender, UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { AUDIT_TRAIL, type AuditTrail } from "../audit";
import { EVENT_REPOSITORY, type EventRepository } from "../events";
import {
  ORDER_LINKS,
  ORDER_REPOSITORY,
  TICKET_REPOSITORY,
  type OrderLinks,
  type OrderRepository,
  type TicketRepository,
} from "../orders";
import {
  SURVEY_REPOSITORY,
  SURVEY_RESPONSE_REPOSITORY,
  type SurveyRepository,
  type SurveyResponseRepository,
} from "../surveys";
import { CampaignsAdminController, CampaignsPublicController } from "./api/campaigns.controllers";
import {
  CAMPAIGN_AUDIENCE_SOURCE,
  CAMPAIGN_DAILY_USAGE,
  CAMPAIGN_MAILER,
  CAMPAIGN_OPTIONS,
  CAMPAIGN_RECIPIENT_REPOSITORY,
  CAMPAIGN_REPOSITORY,
  CampaignService,
  EMAIL_SUPPRESSION_REPOSITORY,
  type AudienceSource,
  type CampaignMailer,
  type CampaignRepository,
  type DailyUsage,
  type RecipientRepository,
  type SuppressionRepository,
} from "./application/campaign-service";
import { CAMPAIGN_SERVICE } from "./campaigns.tokens";
import { audienceSourceOf } from "./infrastructure/audience-source";
import {
  POST_EVENT_TEXTS,
  SmtpCampaignMailer,
  UnsubscribeTokens,
} from "./infrastructure/campaign-email";
import {
  MongoCampaignRepository,
  MongoDailyUsage,
  MongoRecipientRepository,
  MongoSuppressionRepository,
  campaignPersistence,
} from "./infrastructure/campaign.persistence";
import { CampaignScheduler, type CampaignWorkerOptions } from "./infrastructure/campaign.scheduler";

@Module({})
export class CampaignsModule {
  /** The app's shared module instances: an audience reads orders and survey responses. */
  static forRoot(
    events: DynamicModule,
    orders: DynamicModule,
    surveys: DynamicModule,
    worker: CampaignWorkerOptions,
  ): DynamicModule {
    return {
      module: CampaignsModule,
      imports: [campaignPersistence, events, orders, surveys],
      controllers: [CampaignsAdminController, CampaignsPublicController],
      providers: [
        { provide: CAMPAIGN_REPOSITORY, useClass: MongoCampaignRepository },
        { provide: CAMPAIGN_RECIPIENT_REPOSITORY, useClass: MongoRecipientRepository },
        { provide: EMAIL_SUPPRESSION_REPOSITORY, useClass: MongoSuppressionRepository },
        { provide: CAMPAIGN_DAILY_USAGE, useClass: MongoDailyUsage },
        { provide: CAMPAIGN_OPTIONS, useValue: worker },
        {
          provide: CAMPAIGN_AUDIENCE_SOURCE,
          useFactory: (
            orderRepository: OrderRepository,
            tickets: TicketRepository,
            responses: SurveyResponseRepository,
          ) => audienceSourceOf(orderRepository, tickets, responses),
          inject: [ORDER_REPOSITORY, TICKET_REPOSITORY, SURVEY_RESPONSE_REPOSITORY],
        },
        {
          provide: CAMPAIGN_MAILER,
          useFactory: (
            sender: EmailSender,
            eventRepository: EventRepository,
            orderRepository: OrderRepository,
            tickets: TicketRepository,
            links: OrderLinks,
            surveyRepository: SurveyRepository,
            env: ProgramEnv,
          ) =>
            new SmtpCampaignMailer(
              sender,
              eventRepository,
              orderRepository,
              tickets,
              links,
              new UnsubscribeTokens(Buffer.from(env.TICKET_LINK_SECRET, "base64")),
              async (id) => (await surveyRepository.findById(id))?.slug ?? null,
              env.WEB_APP_URL,
            ),
          inject: [
            EMAIL_SENDER,
            EVENT_REPOSITORY,
            ORDER_REPOSITORY,
            TICKET_REPOSITORY,
            ORDER_LINKS,
            SURVEY_REPOSITORY,
            SERVICE_CONFIG,
          ],
        },
        {
          provide: CAMPAIGN_SERVICE,
          useFactory: (
            campaigns: CampaignRepository,
            recipients: RecipientRepository,
            suppressions: SuppressionRepository,
            usage: DailyUsage,
            source: AudienceSource,
            mailer: CampaignMailer,
            eventRepository: EventRepository,
            audit: AuditTrail,
            unitOfWork: UnitOfWork,
            env: ProgramEnv,
          ) =>
            new CampaignService(
              campaigns,
              recipients,
              suppressions,
              usage,
              source,
              mailer,
              eventRepository,
              audit,
              unitOfWork,
              {
                dailyLimit: env.CAMPAIGN_DAILY_LIMIT,
                ratePerMinute: env.CAMPAIGN_RATE_PER_MINUTE,
              },
              POST_EVENT_TEXTS,
            ),
          inject: [
            CAMPAIGN_REPOSITORY,
            CAMPAIGN_RECIPIENT_REPOSITORY,
            EMAIL_SUPPRESSION_REPOSITORY,
            CAMPAIGN_DAILY_USAGE,
            CAMPAIGN_AUDIENCE_SOURCE,
            CAMPAIGN_MAILER,
            EVENT_REPOSITORY,
            AUDIT_TRAIL,
            UNIT_OF_WORK,
            SERVICE_CONFIG,
          ],
        },
        CampaignScheduler,
      ],
      exports: [CAMPAIGN_SERVICE, CampaignScheduler],
    };
  }
}
