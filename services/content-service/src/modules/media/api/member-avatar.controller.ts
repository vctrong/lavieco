import { Controller, Delete, Get, Inject, Put, UploadedFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequireMember,
  type MemberPrincipal,
} from "@lavieco/service-kit";
import { MEDIA_LIMITS, memberAvatarSchema, type MemberAvatar } from "@lavieco/shared/media";

import type { MediaService } from "../application/media-service";
import { MEDIA_SERVICE } from "../media.tokens";
import { ImageUpload, requireFile } from "./image-upload";
import { toMediaDto } from "./media.mapper";

/**
 * A member's own avatar, called by the `web` BFF with the member's token. Always
 * scoped to `principal.userId`: there is no way to name another member (IDOR).
 */
@ApiTags("media")
@Controller("internal/v1/members/me/avatar")
export class MemberAvatarController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Get()
  @RequireMember()
  @ApiOperation({ summary: "The signed-in member's avatar, if any" })
  @ApiZodResponse(200, memberAvatarSchema)
  async get(@CurrentPrincipal() principal: MemberPrincipal): Promise<MemberAvatar> {
    const avatar = await this.media.getAvatar(principal.userId);
    return { avatar: avatar ? toMediaDto(avatar) : null };
  }

  @Put()
  @RequireMember()
  @ImageUpload(MEDIA_LIMITS.maxBytes.avatar)
  @ApiOperation({ summary: "Replace the avatar (JPEG/PNG/WebP, ≤ 2 MB); the old file is deleted" })
  @ApiZodResponse(200, memberAvatarSchema)
  async replace(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentPrincipal() principal: MemberPrincipal,
  ): Promise<MemberAvatar> {
    const avatar = await this.media.replaceAvatar(principal.userId, requireFile(file));
    return { avatar: toMediaDto(avatar) };
  }

  @Delete()
  @RequireMember()
  @ApiOperation({ summary: "Remove the avatar; its file is deleted" })
  @ApiZodResponse(200, memberAvatarSchema)
  async remove(@CurrentPrincipal() principal: MemberPrincipal): Promise<MemberAvatar> {
    await this.media.removeAvatar(principal.userId);
    return { avatar: null };
  }
}
