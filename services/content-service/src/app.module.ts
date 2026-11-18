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
import { ContentAuditModule, type AuditSink } from "./modules/audit";
import { HandbookModule, type PdfRenderer, type TextExtractor } from "./modules/handbook";
import { CloudinaryMediaStorage, MediaModule, type MediaStorage } from "./modules/media";
import { ContentOutboxModule, createWebRevalidator } from "./modules/outbox";
import { StaffAlertsModule, type StaffAlertSink } from "./modules/staff-alerts";

export type AppOverrides = {
  logger?: Logger;
  outbox?: Partial<OutboxOptions>;
  /** Tests verify user tokens against a local key instead of identity's JWKS. */
  userKeyResolver?: JWTVerifyGetKey;
  /** Tests store images in memory instead of Cloudinary. */
  mediaStorage?: MediaStorage;
  /** Off in tests that drive the pending-upload sweep themselves. */
  runMediaSweeper?: boolean;
  /** Tests capture what would reach identity-service (audit, staff alerts) and web. */
  auditSink?: AuditSink;
  staffAlertSink?: StaffAlertSink;
  revalidateFetch?: typeof fetch;
  /** Tests run imports without poppler, and drive the handbook worker themselves. */
  pdfRenderer?: PdfRenderer;
  textExtractor?: TextExtractor;
  runHandbookWorker?: boolean;
  handbookUploadDir?: string;
};

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const HANDBOOK_POLL_MS = 2_000;
const HANDBOOK_HOUSEKEEPING_MS = 6 * 60 * 60 * 1000;

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
        ContentAuditModule.forRoot(overrides.auditSink),
        StaffAlertsModule.forRoot(overrides.staffAlertSink),
        media,
        ContentOutboxModule.forRoot(media),
        HandbookModule.forRoot({
          media,
          uploadDir: overrides.handbookUploadDir ?? env.HANDBOOK_UPLOAD_DIR,
          worker: {
            run: overrides.runHandbookWorker ?? true,
            pollIntervalMs: HANDBOOK_POLL_MS,
            housekeepingIntervalMs: HANDBOOK_HOUSEKEEPING_MS,
          },
          revalidate: createWebRevalidator({
            webAppUrl: env.WEB_APP_URL,
            secret: env.REVALIDATE_SECRET,
            ...(overrides.revalidateFetch ? { fetchImpl: overrides.revalidateFetch } : {}),
          }),
          ...(overrides.pdfRenderer ? { renderer: overrides.pdfRenderer } : {}),
          ...(overrides.textExtractor ? { extractor: overrides.textExtractor } : {}),
        }),
      ],
    };
  }
}
