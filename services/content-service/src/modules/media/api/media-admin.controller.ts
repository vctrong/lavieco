import { Body, Controller, HttpCode, Inject, Post, UploadedFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodValidationPipe,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import {
  MEDIA_LIMITS,
  eventImageUploadFieldsSchema,
  mediaSchema,
  type EventImageUploadFields,
} from "@lavieco/shared/media";

import type { MediaService } from "../application/media-service";
import { MEDIA_SERVICE } from "../media.tokens";
import { ImageUpload, requireFile } from "./image-upload";
import { toMediaDto } from "./media.mapper";

/** Admin uploads of event images, called by the `admin` BFF with a staff token. */
@ApiTags("media")
@Controller("internal/v1/media")
export class MediaAdminController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Post("event-images")
  @HttpCode(201)
  // Event images belong to the Programs module, hence program:write (docs/02 §9.3).
  @RequirePermission("program:write")
  @ImageUpload(MEDIA_LIMITS.maxBytes.event_cover, {
    purpose: { type: "string", enum: ["event_cover", "event_gallery"] },
  })
  @ApiOperation({
    summary: "Upload an event cover or gallery image (JPEG/PNG/WebP, ≤ 8 MB, EXIF stripped)",
  })
  @ApiZodResponse(201, mediaSchema)
  async uploadEventImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(eventImageUploadFieldsSchema)) fields: EventImageUploadFields,
    @CurrentPrincipal() principal: StaffPrincipal,
  ) {
    const record = await this.media.uploadEventImage(fields.purpose, requireFile(file), {
      kind: "staff",
      userId: principal.userId,
    });
    return toMediaDto(record);
  }
}
