import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { AllowServices, ApiZodResponse, ZodQuery, ZodValidationPipe } from "@lavieco/service-kit";
import {
  handbookPageKeySchema,
  handbookPublishedTextQuerySchema,
  handbookPublishedTextSchema,
  handbookSearchQuerySchema,
  handbookSearchResultSchema,
  publicHandbookPageDetailSchema,
  publicHandbookSchema,
  type HandbookPublishedTextQuery,
  type HandbookSearchQuery,
} from "@lavieco/shared/content";

import type { HandbookReader } from "../application/handbook-reader";
import { HANDBOOK_READER } from "../handbook.tokens";

const keyPipe = new ZodValidationPipe(handbookPageKeySchema);
const tokenPipe = new ZodValidationPipe(z.string().regex(/^[A-Za-z0-9_-]{20,100}$/));

/**
 * Public reading of the handbook (UC-02), for `web` only (service token). Published
 * content only (S3); the preview shows the draft behind a short-lived token.
 */
@ApiTags("handbook")
@Controller("internal/v1/published-handbook")
export class HandbookPublicController {
  constructor(@Inject(HANDBOOK_READER) private readonly reader: HandbookReader) {}

  @Get()
  @AllowServices("web")
  @ApiOperation({ summary: "The published book: chapters and pages, without page text" })
  @ApiZodResponse(200, publicHandbookSchema)
  book() {
    return this.reader.book();
  }

  @Get("pages/:key")
  @AllowServices("web")
  @ApiOperation({ summary: "One published page with its text (reading mode, SEO, LaviAgent)" })
  @ApiZodResponse(200, publicHandbookPageDetailSchema)
  page(@Param("key", keyPipe) key: string) {
    return this.reader.page(key);
  }

  @Get("search")
  @AllowServices("web")
  @ApiOperation({ summary: "Accent-insensitive search in the text of the published pages" })
  @ApiZodResponse(200, handbookSearchResultSchema)
  search(@ZodQuery(handbookSearchQuerySchema) query: HandbookSearchQuery) {
    return this.reader.search(query.q);
  }

  @Get("text")
  @AllowServices("web")
  @ApiOperation({ summary: "Text of every published page, paged (for LaviAgent's index later)" })
  @ApiZodResponse(200, handbookPublishedTextSchema)
  text(@ZodQuery(handbookPublishedTextQuerySchema) query: HandbookPublishedTextQuery) {
    return this.reader.publishedText(query.cursor, query.limit);
  }

  @Get("previews/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "The draft behind a 10-minute preview token" })
  @ApiZodResponse(200, publicHandbookSchema)
  preview(@Param("token", tokenPipe) token: string) {
    return this.reader.preview(token);
  }
}
