import { Controller, Get, Headers, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  TOKEN_VERIFIER,
  TokenVerifier,
  ZodBody,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  eventCancelImpactSchema,
  eventCancelRequestSchema,
  type EventCancelRequest,
} from "@lavieco/shared/events";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { EventCancellationService } from "../application/event-cancellation-service";
import { EVENT_CANCELLATION_SERVICE } from "../orders.tokens";

const idPipe = new ZodValidationPipe(objectIdSchema);

/** "Huỷ chương trình" in the back office (`admin`, staff token). */
@ApiTags("events")
@Controller("internal/v1/events")
export class EventCancellationController {
  constructor(
    @Inject(EVENT_CANCELLATION_SERVICE) private readonly cancellation: EventCancellationService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  @Get(":id/cancel-impact")
  @RequirePermission("program:write")
  @ApiOperation({ summary: "Orders and tickets a cancellation would touch (counts only)" })
  @ApiZodResponse(200, eventCancelImpactSchema)
  impact(@Param("id", idPipe) id: string) {
    return this.cancellation.impact(id);
  }

  @Post(":id/cancel")
  @HttpCode(204)
  @RequirePermission("program:write")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiOperation({
    summary:
      "Huỷ chương trình: pending orders cancelled, tickets void, paid orders flagged for a manual refund, buyers emailed. Step-up",
  })
  @ApiZodResponse(204)
  async cancel(
    @Param("id", idPipe) id: string,
    @ZodBody(eventCancelRequestSchema) body: EventCancelRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    await this.cancellation.cancel(id, body, {
      userId: staff.userId,
      roles: staff.roles,
      requestId: currentRequestId() ?? null,
    });
  }
}
