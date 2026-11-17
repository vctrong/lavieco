import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { OutboxWorker, SERVICE_CONFIG } from "@lavieco/service-kit";
import { EVENT_CACHE_TAGS } from "@lavieco/shared/events";
import { SHOP_CACHE_TAGS } from "@lavieco/shared/shop";

import type { ProgramEnv } from "../../config/env";
import {
  MEDIA_ATTACHMENTS,
  RELEASE_MEDIA_JOB,
  REVALIDATE_EVENT_JOB,
  type MediaAttachments,
} from "../events";
import {
  PRODUCT_MEDIA,
  RELEASE_PRODUCT_MEDIA_JOB,
  REVALIDATE_PRODUCT_JOB,
  REVALIDATE_SHOP_TAGS_JOB,
  type ProductMedia,
} from "../shop-catalog";
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
    @Inject(PRODUCT_MEDIA) private readonly productMedia: ProductMedia,
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
    // Shop (ADR-0028): the list and the product page; images given back like event ones.
    this.worker.register(REVALIDATE_PRODUCT_JOB, async (payload) => {
      const slug = String(payload.slug);
      await revalidate({ tags: [SHOP_CACHE_TAGS.products, SHOP_CACHE_TAGS.product(slug)] });
    });
    this.worker.register(REVALIDATE_SHOP_TAGS_JOB, async (payload) => {
      const tags = String(payload.tags).split(",").filter(Boolean);
      if (tags.length > 0) await revalidate({ tags });
    });
    this.worker.register(RELEASE_PRODUCT_MEDIA_JOB, async (payload) => {
      await this.productMedia.release(String(payload.mediaId), String(payload.productId));
    });
  }
}
