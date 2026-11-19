import { type DynamicModule, Module } from "@nestjs/common";
import type { Provider } from "@nestjs/common";
import type { JWTVerifyGetKey } from "jose";

import type { Logger } from "@lavieco/observability";
import {
  AuthModule as AccessModule,
  HealthModule,
  LoggingModule,
  MongoModule,
  NotifyModule,
  OutboxModule,
  ServiceConfigModule,
  parseTrustedServiceKeys,
  type OutboxOptions,
} from "@lavieco/service-kit";

import type { ProgramEnv } from "./config/env";
import { EventTypesModule } from "./modules/event-types";
import { EventsModule, type MediaAttachments } from "./modules/events";
import { ProgramAuditModule, type AuditSink } from "./modules/audit";
import { StaffAlertsModule, type StaffAlertSink } from "./modules/staff-alerts";
import { CampaignsModule } from "./modules/campaigns";
import { CheckinModule } from "./modules/checkin";
import { OrdersModule } from "./modules/orders";
import { PaymentsModule, payosGatewayProvider } from "./modules/payments";
import { RegistrationsModule } from "./modules/registrations";
import { SurveysModule } from "./modules/surveys";
import { ProgramOutboxModule } from "./modules/outbox";
import { ShopCatalogModule, type ProductMedia } from "./modules/shop-catalog";
import { ShopCartsModule } from "./modules/shop-carts";
import { ShopImportsModule } from "./modules/shop-imports";
import { ShopOrdersModule } from "./modules/shop-orders";
import { ShopReviewsModule } from "./modules/shop-reviews";
import { SalesOrdersModule, type StaffDirectory } from "./modules/sales-orders";
import type { EmailSender } from "@lavieco/service-kit/ports";

export type AppOverrides = {
  logger?: Logger;
  outbox?: Partial<OutboxOptions>;
  /** Tests verify user tokens against a local key instead of identity's JWKS. */
  userKeyResolver?: JWTVerifyGetKey;
  /** Captures calls to the revalidation webhook of `web`. */
  revalidateFetch?: typeof fetch;
  /** Stands in for content-service (event images). */
  mediaAttachments?: MediaAttachments;
  /** Stands in for content-service (product images). */
  productMedia?: ProductMedia;
  emailSender?: EmailSender;
  /** Replaces payOS (provider of PAYMENT_GATEWAY). */
  paymentGateway?: Provider;
  /** Captures audit events instead of sending them to identity-service. */
  auditSink?: AuditSink;
  /** Captures staff alerts instead of sending them to identity-service (ADR-0027). */
  staffAlertSink?: StaffAlertSink;
  /** Off in tests that drive the seat-hold expiry themselves. */
  runOrderExpiry?: boolean;
  /** Off in tests that drive the campaign queue themselves. */
  runCampaignWorker?: boolean;
  /** Stands in for identity-service staff directory (order assignees). */
  staffDirectory?: StaffDirectory;
};

const ORDER_EXPIRY_INTERVAL_MS = 60_000;
const CAMPAIGN_INTERVAL_MS = 60_000;

@Module({})
export class AppModule {
  /** Built from parsed env so tests can start the real module graph with fakes. */
  static forRoot(env: ProgramEnv, overrides: AppOverrides = {}): DynamicModule {
    const events = EventsModule.forRoot(overrides.mediaAttachments);
    const orders = OrdersModule.forRoot({
      events,
      gateway: overrides.paymentGateway ?? payosGatewayProvider,
      expiry: { run: overrides.runOrderExpiry ?? true, intervalMs: ORDER_EXPIRY_INTERVAL_MS },
    });
    const surveys = SurveysModule.forRoot(events, orders);
    const shopCatalog = ShopCatalogModule.forRoot(overrides.productMedia);
    const shopCarts = ShopCartsModule.forRoot(shopCatalog);
    const shopOrders = ShopOrdersModule.forRoot({
      orders,
      shopCatalog,
      shopCarts,
      expiry: { run: overrides.runOrderExpiry ?? true, intervalMs: ORDER_EXPIRY_INTERVAL_MS },
    });
    return {
      module: AppModule,
      imports: [
        ServiceConfigModule.forRoot(env),
        LoggingModule.forRoot({
          service: "program-service",
          level: env.LOG_LEVEL,
          logger: overrides.logger,
        }),
        MongoModule.forRoot({
          uri: env.MONGODB_URI,
          dbName: env.MONGODB_DB,
          autoIndex: env.NODE_ENV !== "production",
          waitForDatabase: env.NODE_ENV === "development",
        }),
        AccessModule.forRoot({
          serviceName: "program-service",
          userKeys: overrides.userKeyResolver
            ? { resolver: overrides.userKeyResolver }
            : { jwksUrl: env.IDENTITY_JWKS_URL },
          trustedServiceKeys: parseTrustedServiceKeys(env.SERVICE_TOKEN_TRUSTED_KEYS),
        }),
        NotifyModule.forRoot(overrides.emailSender ? { sender: overrides.emailSender } : { env }),
        OutboxModule.forRoot(overrides.outbox),
        ProgramAuditModule.forRoot(overrides.auditSink),
        StaffAlertsModule.forRoot(overrides.staffAlertSink),
        HealthModule,
        EventTypesModule,
        events,
        orders,
        PaymentsModule.forRoot(orders, shopOrders),
        CheckinModule.forRoot(orders),
        RegistrationsModule.forRoot(events, orders),
        surveys,
        CampaignsModule.forRoot(events, orders, surveys, {
          run: overrides.runCampaignWorker ?? true,
          intervalMs: CAMPAIGN_INTERVAL_MS,
        }),
        shopCatalog,
        ShopImportsModule.forRoot(shopCatalog),
        shopCarts,
        shopOrders,
        ShopReviewsModule.forRoot({ orders, shopCatalog, shopOrders }),
        SalesOrdersModule.forRoot({ staffDirectory: overrides.staffDirectory }),
        ProgramOutboxModule.forRoot(events, shopCatalog, overrides.revalidateFetch),
      ],
    };
  }
}
