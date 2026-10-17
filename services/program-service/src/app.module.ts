import { type DynamicModule, Module } from "@nestjs/common";
import type { JWTVerifyGetKey } from "jose";

import type { Logger } from "@lavieco/observability";
import {
  AuthModule as AccessModule,
  HealthModule,
  LoggingModule,
  MongoModule,
  OutboxModule,
  ServiceConfigModule,
  parseTrustedServiceKeys,
  type OutboxOptions,
} from "@lavieco/service-kit";

import type { ProgramEnv } from "./config/env";
import { EventTypesModule } from "./modules/event-types";
import { EventsModule, type MediaAttachments } from "./modules/events";
import { ProgramOutboxModule } from "./modules/outbox";

export type AppOverrides = {
  logger?: Logger;
  outbox?: Partial<OutboxOptions>;
  /** Tests verify user tokens against a local key instead of identity's JWKS. */
  userKeyResolver?: JWTVerifyGetKey;
  /** Captures calls to the revalidation webhook of `web`. */
  revalidateFetch?: typeof fetch;
  /** Stands in for content-service (event images). */
  mediaAttachments?: MediaAttachments;
};

@Module({})
export class AppModule {
  /** Built from parsed env so tests can start the real module graph with fakes. */
  static forRoot(env: ProgramEnv, overrides: AppOverrides = {}): DynamicModule {
    const events = EventsModule.forRoot(overrides.mediaAttachments);
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
        }),
        AccessModule.forRoot({
          serviceName: "program-service",
          userKeys: overrides.userKeyResolver
            ? { resolver: overrides.userKeyResolver }
            : { jwksUrl: env.IDENTITY_JWKS_URL },
          trustedServiceKeys: parseTrustedServiceKeys(env.SERVICE_TOKEN_TRUSTED_KEYS),
        }),
        OutboxModule.forRoot(overrides.outbox),
        HealthModule,
        EventTypesModule,
        events,
        ProgramOutboxModule.forRoot(events, overrides.revalidateFetch),
      ],
    };
  }
}
