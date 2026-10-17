import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker, SERVICE_CONFIG } from "@lavieco/service-kit";
import { EVENT_CACHE_TAGS } from "@lavieco/shared/events";

import type { ProgramEnv } from "../../config/env";
import {
  MEDIA_ATTACHMENTS,
  RELEASE_MEDIA_JOB,
  REVALIDATE_EVENT_JOB,
  type MediaAttachments,
} from "../events";
import { createWebRevalidator } from "./web-revalidator";

export const REVALIDATE_FETCH = Symbol("REVALIDATE_FETCH");

/** Registers program-service's outbox handlers (docs/04 §6.5). Payloads carry no PII. */
@Injectable()
export class ProgramOutboxHandlers implements OnModuleInit {
  constructor(
    private readonly worker: OutboxWorker,
    @Inject(SERVICE_CONFIG) private readonly env: ProgramEnv,
    @Inject(REVALIDATE_FETCH) private readonly fetchImpl: typeof fetch,
    @Inject(MEDIA_ATTACHMENTS) private readonly media: MediaAttachments,
  ) {}

  onModuleInit() {
    const revalidate = createWebRevalidator({
      webAppUrl: this.env.WEB_APP_URL,
      secret: this.env.REVALIDATE_SECRET,
      fetchImpl: this.fetchImpl,
    });
    this.worker.register(REVALIDATE_EVENT_JOB, async (payload) => {
      const slug = String(payload.slug);
      await revalidate({ tags: [EVENT_CACHE_TAGS.list, EVENT_CACHE_TAGS.item(slug)] });
    });
    // Retried until content-service confirms; it then deletes the file (ADR-0020).
    this.worker.register(RELEASE_MEDIA_JOB, async (payload) => {
      await this.media.release(String(payload.mediaId), String(payload.eventId));
    });
  }
}
