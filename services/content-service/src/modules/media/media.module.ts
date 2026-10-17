import { type DynamicModule, Module } from "@nestjs/common";

import { OUTBOX_PORT, UNIT_OF_WORK } from "@lavieco/service-kit";
import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";

import { MediaAdminController } from "./api/media-admin.controller";
import { MediaInternalController } from "./api/media-internal.controller";
import { MemberAvatarController } from "./api/member-avatar.controller";
import { MediaService } from "./application/media-service";
import { IMAGE_PROCESSOR, type ImageProcessor } from "./application/ports/image-processor.port";
import { MEDIA_REPOSITORY, type MediaRepository } from "./application/ports/media-repository.port";
import { MEDIA_STORAGE, type MediaStorage } from "./application/ports/media-storage.port";
import { mediaPersistence } from "./infrastructure/media.model";
import { MongoMediaRepository } from "./infrastructure/media.repository";
import {
  PendingMediaSweeper,
  type MediaSweeperOptions,
} from "./infrastructure/pending-media-sweeper";
import { SharpImageProcessor } from "./infrastructure/sharp-image-processor";
import { MEDIA_SERVICE, MEDIA_SWEEPER_OPTIONS } from "./media.tokens";

export type MediaModuleOptions = {
  storage: MediaStorage;
  /** `lavieco/dev` or `lavieco/prod`, from NODE_ENV (ADR-0020). */
  rootFolder: string;
  sweeper: MediaSweeperOptions;
};

@Module({})
export class MediaModule {
  /** The storage is handed in so tests run the real module with an in-memory fake. */
  static forRoot(options: MediaModuleOptions): DynamicModule {
    return {
      module: MediaModule,
      imports: [mediaPersistence],
      controllers: [MediaAdminController, MediaInternalController, MemberAvatarController],
      providers: [
        { provide: MEDIA_REPOSITORY, useClass: MongoMediaRepository },
        { provide: MEDIA_STORAGE, useValue: options.storage },
        { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
        { provide: MEDIA_SWEEPER_OPTIONS, useValue: options.sweeper },
        {
          provide: MEDIA_SERVICE,
          useFactory: (
            media: MediaRepository,
            storage: MediaStorage,
            images: ImageProcessor,
            unitOfWork: UnitOfWork,
            outbox: OutboxPort,
          ) => new MediaService(media, storage, images, unitOfWork, outbox, options.rootFolder),
          inject: [MEDIA_REPOSITORY, MEDIA_STORAGE, IMAGE_PROCESSOR, UNIT_OF_WORK, OUTBOX_PORT],
        },
        PendingMediaSweeper,
      ],
      exports: [MEDIA_SERVICE, PendingMediaSweeper],
    };
  }
}
