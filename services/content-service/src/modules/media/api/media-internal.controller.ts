import { Controller, Delete, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse, ZodBody, ZodValidationPipe } from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  mediaAttachRequestSchema,
  mediaReleaseRequestSchema,
  mediaSchema,
  type MediaAttachRequest,
  type MediaReleaseRequest,
} from "@lavieco/shared/media";

import type { MediaService } from "../application/media-service";
import { MEDIA_SERVICE } from "../media.tokens";
import { toMediaDto } from "./media.mapper";

/** Service-to-service calls: program-service holds event images, identity erases members. */
@ApiTags("media")
@Controller("internal/v1")
export class MediaInternalController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Post("media/:id/attach")
  @HttpCode(200)
  @AllowServices("program-service")
  @ApiOperation({
    summary: "Attach an uploaded image to an event; returns what the event snapshots",
  })
  @ApiZodResponse(200, mediaSchema)
  async attach(
    @Param("id", new ZodValidationPipe(objectIdSchema)) id: string,
    @ZodBody(mediaAttachRequestSchema) body: MediaAttachRequest,
  ) {
    return toMediaDto(await this.media.attach(id, body));
  }

  @Post("media/:id/release")
  @HttpCode(204)
  @AllowServices("program-service")
  @ApiOperation({ summary: "Release an image its event no longer uses; the file is deleted" })
  @ApiZodResponse(204)
  async release(
    @Param("id", new ZodValidationPipe(objectIdSchema)) id: string,
    @ZodBody(mediaReleaseRequestSchema) body: MediaReleaseRequest,
  ) {
    await this.media.release(id, body.ref);
  }

  /** TODO(UC-29): called by identity-service once account deletion exists. */
  @Delete("members/:userId/media")
  @HttpCode(204)
  @AllowServices("identity-service")
  @ApiOperation({ summary: "Erase every image of a member (account deletion, UC-29)" })
  @ApiZodResponse(204)
  async eraseMember(@Param("userId", new ZodValidationPipe(objectIdSchema)) userId: string) {
    await this.media.eraseMemberMedia(userId);
  }
}
