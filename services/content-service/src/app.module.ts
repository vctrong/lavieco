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

import { mediaRootFolder, type ContentEnv } from "./config/env";
import { CloudinaryMediaStorage, MediaModule, type MediaStorage } from "./modules/media";
import { ContentOutboxModule } from "./modules/outbox";

export type AppOverrides = {
  logger?: Logger;
  outbox?: Partial<OutboxOptions>;
  /** Tests verify user tokens against a local key instead of identity's JWKS. */
  userKeyResolver?: JWTVerifyGetKey;
  /** Tests store images in memory instead of Cloudinary. */
  mediaStorage?: MediaStorage;
  /** Off in tests that drive the pending-upload sweep themselves. */
  runMediaSweeper?: boolean;
};

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

@Module({})
export class AppModule {
  /** Built from parsed env so tests can start the real module graph with fakes. */
  static forRoot(env: ContentEnv, overrides: AppOverrides = {}): DynamicModule {
    const media = MediaModule.forRoot({
      storage:
        overrides.mediaStorage ??
        new CloudinaryMediaStorage({
          cloudName: env.CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
          apiSecret: env.CLOUDINARY_API_SECRET,
        }),
      rootFolder: mediaRootFolder(env),
      sweeper: { run: overrides.runMediaSweeper ?? true, intervalMs: SWEEP_INTERVAL_MS },
    });
    return {
      module: AppModule,
      imports: [
        ServiceConfigModule.forRoot(env),
        LoggingModule.forRoot({
          service: "content-service",
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
          serviceName: "content-service",
          userKeys: overrides.userKeyResolver
            ? { resolver: overrides.userKeyResolver }
            : { jwksUrl: env.IDENTITY_JWKS_URL },
          trustedServiceKeys: parseTrustedServiceKeys(env.SERVICE_TOKEN_TRUSTED_KEYS),
        }),
        OutboxModule.forRoot(overrides.outbox),
        HealthModule,
        media,
        ContentOutboxModule.forRoot(media),
      ],
    };
  }
}
