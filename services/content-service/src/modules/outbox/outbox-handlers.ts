import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker } from "@lavieco/service-kit";

import { MEDIA_DESTROY_JOB, MEDIA_SERVICE, type MediaService } from "../media";

/** Registers content-service's outbox handlers (docs/04 §6.5). Payloads carry ids only. */
@Injectable()
export class ContentOutboxHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(MEDIA_SERVICE) private readonly media: MediaService,
  ) {}

  onModuleInit() {
    this.worker.register(MEDIA_DESTROY_JOB, async (payload) => {
      await this.media.destroyStored(String(payload.mediaId));
    });
  }
}
