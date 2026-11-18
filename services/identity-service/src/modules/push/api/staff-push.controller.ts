import { Controller, Delete, Get, HttpCode, Inject, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequireStaff,
  ZodBody,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import {
  pushNotificationRequestSchema,
  pushNotificationResponseSchema,
  pushSettingsSchema,
  pushSubscriptionRequestSchema,
  pushTestResponseSchema,
  pushTopicsUpdateRequestSchema,
  pushUnsubscribeRequestSchema,
  type PushNotificationRequest,
  type PushSubscriptionRequest,
  type PushTopicsUpdateRequest,
  type PushUnsubscribeRequest,
} from "@lavieco/shared/identity";

import type { PushService } from "../application/push-service";
import { PUSH_SERVICE } from "../push.tokens";

/**
 * Staff alert settings of the signed-in staff member (called by `admin` with their
 * token). Every route acts on the caller's own devices and choices only.
 */
@ApiTags("push")
@Controller("internal/v1/staff/me/push")
export class StaffPushController {
  constructor(@Inject(PUSH_SERVICE) private readonly push: PushService) {}

  @Get()
  @RequireStaff()
  @ApiOperation({ summary: "Alert settings, allowed topics and devices of the caller" })
  @ApiZodResponse(200, pushSettingsSchema)
  settings(@CurrentPrincipal() principal: StaffPrincipal) {
    return this.push.settings(principal.userId);
  }

  @Put("topics")
  @RequireStaff()
  @ApiOperation({ summary: "Choose the alert topics (cut down to the caller's permissions)" })
  @ApiZodResponse(200, pushSettingsSchema)
  setTopics(
    @CurrentPrincipal() principal: StaffPrincipal,
    @ZodBody(pushTopicsUpdateRequestSchema) body: PushTopicsUpdateRequest,
  ) {
    return this.push.setTopics(principal.userId, body.topics);
  }

  @Put("subscriptions")
  @HttpCode(204)
  @RequireStaff()
  @ApiOperation({ summary: "Register this browser for alerts (idempotent on the endpoint)" })
  @ApiZodResponse(204)
  async subscribe(
    @CurrentPrincipal() principal: StaffPrincipal,
    @ZodBody(pushSubscriptionRequestSchema) body: PushSubscriptionRequest,
  ) {
    await this.push.subscribe(principal.userId, body);
  }

  @Delete("subscriptions")
  @HttpCode(204)
  @RequireStaff()
  @ApiOperation({ summary: "Stop alerts on this browser" })
  @ApiZodResponse(204)
  async unsubscribe(
    @CurrentPrincipal() principal: StaffPrincipal,
    @ZodBody(pushUnsubscribeRequestSchema) body: PushUnsubscribeRequest,
  ) {
    await this.push.unsubscribe(principal.userId, body.endpoint);
  }

  @Post("test")
  @HttpCode(200)
  @RequireStaff()
  @ApiOperation({ summary: "Send a test alert to every device of the caller" })
  @ApiZodResponse(200, pushTestResponseSchema)
  test(@CurrentPrincipal() principal: StaffPrincipal) {
    return this.push.sendTest(principal.userId);
  }
}

/** Alerts raised by other services, delivered by their outbox (ADR-0027). */
@ApiTags("push")
@Controller("internal/v1/push-notifications")
export class PushNotificationsController {
  constructor(@Inject(PUSH_SERVICE) private readonly push: PushService) {}

  @Post()
  @HttpCode(200)
  @AllowServices("program-service", "lead-service", "content-service")
  @ApiOperation({ summary: "Alert the staff who want this topic (idempotent on notificationId)" })
  @ApiZodResponse(200, pushNotificationResponseSchema)
  notify(@ZodBody(pushNotificationRequestSchema) body: PushNotificationRequest) {
    return this.push.notify(body);
  }
}
