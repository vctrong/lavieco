import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { AllowServices, ApiZodResponse, ZodQuery, ZodValidationPipe } from "@lavieco/service-kit";
import {
  eventSlugSchema,
  publicEventDetailSchema,
  publicEventListQuerySchema,
  publicEventListSchema,
  type PublicEventListQuery,
} from "@lavieco/shared/events";

import { EventPublicService } from "../application/event-public-service";
import { EVENT_PUBLIC_SERVICE } from "../events.tokens";
import { toPublicCardDto, toPublicDetailDto } from "./event.mapper";

const previewTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

/** `/chuong-trinh` and `/chuong-trinh/[slug]` (called by `web`). Never drafts (S3). */
@ApiTags("published-events")
@Controller("internal/v1")
export class EventsPublicController {
  constructor(@Inject(EVENT_PUBLIC_SERVICE) private readonly events: EventPublicService) {}

  @Get("published-events")
  @AllowServices("web")
  @ApiOperation({ summary: "Upcoming (published, closed) or past (ended) events" })
  @ApiZodResponse(200, publicEventListSchema)
  async list(@ZodQuery(publicEventListQuerySchema) query: PublicEventListQuery) {
    const page = await this.events.list(query);
    return { items: page.items.map(toPublicCardDto), nextCursor: page.nextCursor };
  }

  @Get("published-events/:slug")
  @AllowServices("web")
  @ApiOperation({ summary: "Public page of one event; 404 for drafts and unknown slugs" })
  @ApiZodResponse(200, publicEventDetailSchema)
  async get(@Param("slug", new ZodValidationPipe(eventSlugSchema)) slug: string) {
    return toPublicDetailDto(await this.events.getBySlug(slug));
  }

  @Get("event-previews/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "Preview of any event (draft included) behind a short-lived token" })
  @ApiZodResponse(200, publicEventDetailSchema)
  async preview(@Param("token", new ZodValidationPipe(previewTokenSchema)) token: string) {
    return toPublicDetailDto(await this.events.getPreview(token));
  }
}
