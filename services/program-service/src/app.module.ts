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
import { CheckinModule } from "./modules/checkin";
import { OrdersModule } from "./modules/orders";
import { PaymentsModule, payosGatewayProvider } from "./modules/payments";
import { RegistrationsModule } from "./modules/registrations";
import { ProgramOutboxModule } from "./modules/outbox";
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
  emailSender?: EmailSender;
  /** Replaces payOS (provider of PAYMENT_GATEWAY). */
  paymentGateway?: Provider;
  /** Captures audit events instead of sending them to identity-service. */
  auditSink?: AuditSink;
  /** Off in tests that drive the seat-hold expiry themselves. */
  runOrderExpiry?: boolean;
};

const ORDER_EXPIRY_INTERVAL_MS = 60_000;

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
        HealthModule,
        EventTypesModule,
        events,
        orders,
        PaymentsModule.forRoot(orders),
        CheckinModule.forRoot(orders),
        RegistrationsModule.forRoot(events, orders),
        ProgramOutboxModule.forRoot(events, overrides.revalidateFetch),
      ],
    };
  }
}
