import { type DynamicModule, Module, type Provider } from "@nestjs/common";

import {
  EMAIL_SENDER,
  OUTBOX_PORT,
  SERVICE_CONFIG,
  TOKEN_VERIFIER,
  UNIT_OF_WORK,
  type TokenVerifier,
} from "@lavieco/service-kit";
import type { EmailSender, OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import type { ProgramEnv } from "../../config/env";
import { EVENT_REPOSITORY, type EventRepository } from "../events";
import { TICKET_TYPE_REPOSITORY, TicketingModule, type TicketTypeRepository } from "../ticketing";
import { OrdersPublicController } from "./api/orders-public.controller";
import { CheckoutService } from "./application/checkout-service";
import { OrderExpiryService } from "./application/order-expiry-service";
import {
  ORDER_ANSWER_REPOSITORY,
  ORDER_REPOSITORY,
  PAYMENT_EVENT_REPOSITORY,
  TICKET_REPOSITORY,
  type OrderAnswerRepository,
  type OrderRepository,
  type TicketRepository,
} from "./application/ports/order-repositories.port";
import {
  EMAIL_PROOF_VERIFIER,
  ORDER_LINKS,
  PAYMENT_GATEWAY,
  TICKET_MAILER,
  type EmailProofVerifier,
  type OrderLinks,
  type PaymentGateway,
} from "./application/ports/order-services.port";
import { DisabledPaymentGateway } from "./infrastructure/disabled-payment-gateway";
import { JwksEmailProofVerifier } from "./infrastructure/email-proof-verifier";
import { HmacOrderLinks } from "./infrastructure/hmac-order-links";
import { OrderJobHandlers } from "./infrastructure/order-job-handlers";
import {
  OrderExpiryScheduler,
  type OrderExpiryOptions,
} from "./infrastructure/order-expiry.scheduler";
import { orderPersistence } from "./infrastructure/order.models";
import { MongoOrderRepository } from "./infrastructure/order.repository";
import { SmtpTicketMailer } from "./infrastructure/smtp-ticket-mailer";
import {
  MongoOrderAnswerRepository,
  MongoPaymentEventRepository,
  MongoTicketRepository,
} from "./infrastructure/ticket.repository";
import { CHECKOUT_SERVICE, ORDER_EXPIRY_OPTIONS, ORDER_EXPIRY_SERVICE } from "./orders.tokens";

export type OrdersModuleOptions = {
  /** The app's `events` module instance (a dynamic module, shared). */
  events: DynamicModule;
  /**
   * Provider of `PAYMENT_GATEWAY` (payOS, from the `payments` module, or a fake in
   * tests). Without it only free events can be booked.
   */
  gateway?: Provider;
  expiry: OrderExpiryOptions;
};

@Module({})
export class OrdersModule {
  static forRoot(options: OrdersModuleOptions): DynamicModule {
    const gateway: Provider = options.gateway ?? {
      provide: PAYMENT_GATEWAY,
      useValue: new DisabledPaymentGateway(),
    };
    return {
      module: OrdersModule,
      imports: [orderPersistence, options.events, TicketingModule],
      controllers: [OrdersPublicController],
      providers: [
        gateway,
        { provide: ORDER_REPOSITORY, useClass: MongoOrderRepository },
        { provide: ORDER_ANSWER_REPOSITORY, useClass: MongoOrderAnswerRepository },
        { provide: TICKET_REPOSITORY, useClass: MongoTicketRepository },
        { provide: PAYMENT_EVENT_REPOSITORY, useClass: MongoPaymentEventRepository },
        { provide: ORDER_EXPIRY_OPTIONS, useValue: options.expiry },
        {
          provide: EMAIL_PROOF_VERIFIER,
          useFactory: (tokens: TokenVerifier) => new JwksEmailProofVerifier(tokens),
          inject: [TOKEN_VERIFIER],
        },
        {
          provide: ORDER_LINKS,
          useFactory: (env: ProgramEnv) =>
            new HmacOrderLinks(Buffer.from(env.TICKET_LINK_SECRET, "base64")),
          inject: [SERVICE_CONFIG],
        },
        {
          provide: TICKET_MAILER,
          useFactory: (
            orders: OrderRepository,
            tickets: TicketRepository,
            events: EventRepository,
            links: OrderLinks,
            sender: EmailSender,
            env: ProgramEnv,
          ) => new SmtpTicketMailer(orders, tickets, events, links, sender, env.WEB_APP_URL),
          inject: [
            ORDER_REPOSITORY,
            TICKET_REPOSITORY,
            EVENT_REPOSITORY,
            ORDER_LINKS,
            EMAIL_SENDER,
            SERVICE_CONFIG,
          ],
        },
        {
          provide: CHECKOUT_SERVICE,
          useFactory: (
            events: EventRepository,
            ticketTypes: TicketTypeRepository,
            orders: OrderRepository,
            answers: OrderAnswerRepository,
            tickets: TicketRepository,
            proofs: EmailProofVerifier,
            payments: PaymentGateway,
            links: OrderLinks,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
            env: ProgramEnv,
          ) =>
            new CheckoutService(
              events,
              ticketTypes,
              orders,
              answers,
              tickets,
              proofs,
              payments,
              links,
              unitOfWork,
              outbox,
              { webAppUrl: env.WEB_APP_URL },
            ),
          inject: [
            EVENT_REPOSITORY,
            TICKET_TYPE_REPOSITORY,
            ORDER_REPOSITORY,
            ORDER_ANSWER_REPOSITORY,
            TICKET_REPOSITORY,
            EMAIL_PROOF_VERIFIER,
            PAYMENT_GATEWAY,
            ORDER_LINKS,
            UNIT_OF_WORK,
            OUTBOX_PORT,
            SERVICE_CONFIG,
          ],
        },
        {
          provide: ORDER_EXPIRY_SERVICE,
          useFactory: (
            orders: OrderRepository,
            checkout: CheckoutService,
            unitOfWork: UnitOfWork,
          ) => new OrderExpiryService(orders, checkout, unitOfWork),
          inject: [ORDER_REPOSITORY, CHECKOUT_SERVICE, UNIT_OF_WORK],
        },
        OrderExpiryScheduler,
        OrderJobHandlers,
      ],
      exports: [
        ORDER_REPOSITORY,
        ORDER_ANSWER_REPOSITORY,
        TICKET_REPOSITORY,
        PAYMENT_EVENT_REPOSITORY,
        PAYMENT_GATEWAY,
        ORDER_LINKS,
        CHECKOUT_SERVICE,
        OrderExpiryScheduler,
      ],
    };
  }
}
