import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodValidationPipe,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  checkinRequestSchema,
  checkinResponseSchema,
  checkinStatsSchema,
  type CheckinRequest,
} from "@lavieco/shared/events";

import { CheckinService } from "../application/checkin-service";
import { CHECKIN_SERVICE } from "../checkin.tokens";

/** Door check-in from the admin scanner (`checkin:perform`, mobile first). */
@ApiTags("checkin")
@Controller("internal/v1")
export class CheckinsController {
  constructor(@Inject(CHECKIN_SERVICE) private readonly checkin: CheckinService) {}

  @Post("checkins")
  @HttpCode(200)
  @RequirePermission("checkin:perform")
  @ApiOperation({
    summary: "Check in a ticket by QR token or typed code: valid, already_used, invalid",
  })
  @ApiZodResponse(200, checkinResponseSchema)
  checkIn(
    @ZodBody(checkinRequestSchema) body: CheckinRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return this.checkin.checkIn(body, staff.userId);
  }

  @Get("events/:id/checkin-stats")
  @RequirePermission("checkin:perform")
  @ApiOperation({ summary: "Checked-in over valid tickets of one event" })
  @ApiZodResponse(200, checkinStatsSchema)
  stats(@Param("id", new ZodValidationPipe(objectIdSchema)) id: string) {
    return this.checkin.stats(id);
  }
}
