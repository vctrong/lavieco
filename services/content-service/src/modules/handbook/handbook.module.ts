import { type DynamicModule, Module } from "@nestjs/common";

import { OUTBOX_PORT, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import { AUDIT_TRAIL, ContentAuditModule, type AuditTrail } from "../audit";
import { MEDIA_SERVICE } from "../media";
import { HandbookAdminController } from "./api/handbook-admin.controller";
import { HandbookImportsController } from "./api/handbook-imports.controller";
import { HandbookPublicController } from "./api/handbook-public.controller";
import { HandbookEditor } from "./application/handbook-editor";
import { HandbookImports } from "./application/handbook-imports";
import { HandbookReader } from "./application/handbook-reader";
import {
  HANDBOOK_REPOSITORY,
  type HandbookRepository,
} from "./application/ports/handbook-repository.port";
import {
  IMPORT_JOB_REPOSITORY,
  PDF_RENDERER,
  TEXT_EXTRACTOR,
  UPLOAD_REPOSITORY,
  UPLOAD_STORE,
  type ImportJobRepository,
  type PdfRenderer,
  type TextExtractor,
  type UploadRepository,
  type UploadStore,
} from "./application/ports/import-ports";
import { HANDBOOK_PAGE_MEDIA, type HandbookPageMedia } from "./application/ports/page-media.port";
import {
  HANDBOOK_PREVIEW_TOKENS,
  type HandbookPreviewTokenRepository,
} from "./application/ports/preview-token-repository.port";
import {
  HANDBOOK_EDITOR,
  HANDBOOK_IMPORTS,
  HANDBOOK_READER,
  HANDBOOK_REVALIDATE,
  HANDBOOK_WORKER_OPTIONS,
} from "./handbook.tokens";
import { DiskUploadStore } from "./infrastructure/disk-upload-store";
import { HandbookJobHandlers, type RevalidateTags } from "./infrastructure/handbook-job-handlers";
import { handbookPersistence } from "./infrastructure/handbook.models";
import { MongoHandbookRepository } from "./infrastructure/handbook.repository";
import { HandbookWorker, type HandbookWorkerOptions } from "./infrastructure/handbook-worker";
import {
  MongoHandbookPreviewTokenRepository,
  MongoImportJobRepository,
  MongoUploadRepository,
} from "./infrastructure/import.repositories";
import { PopplerPdfRenderer, PopplerTextExtractor } from "./infrastructure/poppler";

export type HandbookModuleOptions = {
  /** The configured media module (Nest keeps one instance). */
  media: DynamicModule;
  uploadDir: string;
  worker: HandbookWorkerOptions;
  revalidate: RevalidateTags;
  /** Tests replace poppler with fakes. */
  renderer?: PdfRenderer;
  extractor?: TextExtractor;
};

/** Digital Green Handbook (ADR-0029): editor, imports, public reading, background work. */
@Module({})
export class HandbookModule {
  static forRoot(options: HandbookModuleOptions): DynamicModule {
    return {
      module: HandbookModule,
      imports: [handbookPersistence, options.media, ContentAuditModule],
      controllers: [HandbookAdminController, HandbookImportsController, HandbookPublicController],
      providers: [
        { provide: HANDBOOK_REPOSITORY, useClass: MongoHandbookRepository },
        { provide: UPLOAD_REPOSITORY, useClass: MongoUploadRepository },
        { provide: IMPORT_JOB_REPOSITORY, useClass: MongoImportJobRepository },
        { provide: HANDBOOK_PREVIEW_TOKENS, useClass: MongoHandbookPreviewTokenRepository },
        { provide: UPLOAD_STORE, useValue: new DiskUploadStore(options.uploadDir) },
        { provide: PDF_RENDERER, useValue: options.renderer ?? new PopplerPdfRenderer() },
        { provide: TEXT_EXTRACTOR, useValue: options.extractor ?? new PopplerTextExtractor() },
        { provide: HANDBOOK_PAGE_MEDIA, useExisting: MEDIA_SERVICE },
        { provide: HANDBOOK_WORKER_OPTIONS, useValue: options.worker },
        { provide: HANDBOOK_REVALIDATE, useValue: options.revalidate },
        {
          provide: HANDBOOK_EDITOR,
          useFactory: (
            handbooks: HandbookRepository,
            previews: HandbookPreviewTokenRepository,
            media: HandbookPageMedia,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
            audit: AuditTrail,
          ) => new HandbookEditor(handbooks, previews, media, unitOfWork, outbox, audit),
          inject: [
            HANDBOOK_REPOSITORY,
            HANDBOOK_PREVIEW_TOKENS,
            HANDBOOK_PAGE_MEDIA,
            UNIT_OF_WORK,
            OUTBOX_PORT,
            AUDIT_TRAIL,
          ],
        },
        {
          provide: HANDBOOK_IMPORTS,
          useFactory: (
            handbooks: HandbookRepository,
            uploads: UploadRepository,
            jobs: ImportJobRepository,
            store: UploadStore,
            renderer: PdfRenderer,
            extractor: TextExtractor,
            media: HandbookPageMedia,
            unitOfWork: UnitOfWork,
            audit: AuditTrail,
          ) =>
            new HandbookImports(
              handbooks,
              uploads,
              jobs,
              store,
              renderer,
              extractor,
              media,
              unitOfWork,
              audit,
            ),
          inject: [
            HANDBOOK_REPOSITORY,
            UPLOAD_REPOSITORY,
            IMPORT_JOB_REPOSITORY,
            UPLOAD_STORE,
            PDF_RENDERER,
            TEXT_EXTRACTOR,
            HANDBOOK_PAGE_MEDIA,
            UNIT_OF_WORK,
            AUDIT_TRAIL,
          ],
        },
        {
          provide: HANDBOOK_READER,
          useFactory: (handbooks: HandbookRepository, previews: HandbookPreviewTokenRepository) =>
            new HandbookReader(handbooks, previews),
          inject: [HANDBOOK_REPOSITORY, HANDBOOK_PREVIEW_TOKENS],
        },
        HandbookWorker,
        HandbookJobHandlers,
      ],
      exports: [HandbookWorker, HANDBOOK_EDITOR, HANDBOOK_IMPORTS],
    };
  }
}
