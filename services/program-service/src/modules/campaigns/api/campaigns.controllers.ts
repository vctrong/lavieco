import { Controller, Get, Headers, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  TOKEN_VERIFIER,
  TokenVerifier,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  audiencePreviewRequestSchema,
  audiencePreviewSchema,
  campaignCreateRequestSchema,
  campaignListQuerySchema,
  campaignListSchema,
  campaignRecipientListQuerySchema,
  campaignRecipientListSchema,
  campaignRenderedSchema,
  campaignSchema,
  campaignSendRequestSchema,
  campaignTestRequestSchema,
  campaignUpdateRequestSchema,
  unsubscribeRequestSchema,
  unsubscribeTokenSchema,
  type AudiencePreviewRequest,
  type CampaignCreateRequest,
  type CampaignListQuery,
  type CampaignRecipientListQuery,
  type CampaignSendRequest,
  type CampaignTestRequest,
  type CampaignUpdateRequest,
  type CampaignView,
  type UnsubscribeRequest,
} from "@lavieco/shared/events";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { CampaignService } from "../application/campaign-service";
import { CAMPAIGN_SERVICE } from "../campaigns.tokens";
import type { CampaignRecord } from "../domain/campaign";

const idPipe = new ZodValidationPipe(objectIdSchema);

const actorOf = (staff: StaffPrincipal) => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** Bulk email in the back office. Everything needs `campaign:send`: lists hold personal data. */
@ApiTags("campaigns")
@Controller("internal/v1/campaigns")
export class CampaignsAdminController {
  constructor(
    @Inject(CAMPAIGN_SERVICE) private readonly campaigns: CampaignService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  private dto(campaign: CampaignRecord): CampaignView {
    return {
      ...campaign,
      scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.toISOString() : null,
      estimatedDays: this.campaigns.estimatedDaysOf(campaign),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  @Get()
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Campaigns, newest first" })
  @ApiZodResponse(200, campaignListSchema)
  async list(@ZodQuery(campaignListQuerySchema) query: CampaignListQuery) {
    const page = await this.campaigns.list(query);
    return { items: page.items.map((item) => this.dto(item)), nextCursor: page.nextCursor };
  }

  @Post()
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Create a draft campaign" })
  @ApiZodResponse(201, campaignSchema)
  async create(
    @ZodBody(campaignCreateRequestSchema) body: CampaignCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return this.dto(await this.campaigns.create(body, actorOf(staff)));
  }

  @Post("audience-preview")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "How many people an audience reaches, deduplicated, with examples" })
  @ApiZodResponse(200, audiencePreviewSchema)
  preview(@ZodBody(audiencePreviewRequestSchema) body: AudiencePreviewRequest) {
    return this.campaigns.previewAudience(body.audience);
  }

  @Get(":id")
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "One campaign, with its counters" })
  @ApiZodResponse(200, campaignSchema)
  async get(@Param("id", idPipe) id: string) {
    return this.dto(await this.campaigns.get(id));
  }

  @Patch(":id")
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Edit a draft" })
  @ApiZodResponse(200, campaignSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(campaignUpdateRequestSchema) body: CampaignUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return this.dto(await this.campaigns.update(id, body, actorOf(staff)));
  }

  @Get(":id/rendered")
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "The email as it will look, with example links" })
  @ApiZodResponse(200, campaignRenderedSchema)
  rendered(@Param("id", idPipe) id: string) {
    return this.campaigns.render(id);
  }

  @Post(":id/test")
  @HttpCode(204)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Send a test copy to one address; counts against nothing" })
  @ApiZodResponse(204)
  async test(
    @Param("id", idPipe) id: string,
    @ZodBody(campaignTestRequestSchema) body: CampaignTestRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    await this.campaigns.sendTest(id, body.email, actorOf(staff));
  }

  @Post(":id/send")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiOperation({ summary: "Send now or schedule; step-up and the typed recipient count" })
  @ApiZodResponse(200, campaignSchema)
  async send(
    @Param("id", idPipe) id: string,
    @ZodBody(campaignSendRequestSchema) body: CampaignSendRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    return this.dto(await this.campaigns.send(id, body, actorOf(staff)));
  }

  @Post(":id/pause")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Stop taking from the queue; what was sent stays sent" })
  @ApiZodResponse(200, campaignSchema)
  async pause(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return this.dto(await this.campaigns.pause(id, actorOf(staff)));
  }

  @Post(":id/resume")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Carry on from where it stopped" })
  @ApiZodResponse(200, campaignSchema)
  async resume(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return this.dto(await this.campaigns.resume(id, actorOf(staff)));
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Cancel; nothing more goes out" })
  @ApiZodResponse(200, campaignSchema)
  async cancel(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return this.dto(await this.campaigns.cancel(id, actorOf(staff)));
  }

  @Post(":id/retry-failed")
  @HttpCode(200)
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Queue the failed emails again" })
  @ApiZodResponse(200, campaignSchema)
  async retry(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return this.dto(await this.campaigns.retryFailed(id, actorOf(staff)));
  }

  @Get(":id/recipients")
  @RequirePermission("campaign:send")
  @ApiOperation({ summary: "Who it goes to and how each email went" })
  @ApiZodResponse(200, campaignRecipientListSchema)
  async recipients(
    @Param("id", idPipe) id: string,
    @ZodQuery(campaignRecipientListQuerySchema) query: CampaignRecipientListQuery,
  ) {
    const page = await this.campaigns.listRecipients(id, query);
    return {
      items: page.items.map((item) => ({
        id: item.id,
        email: item.email,
        name: item.name,
        status: item.status,
        error: item.error,
        sentAt: item.sentAt ? item.sentAt.toISOString() : null,
      })),
      nextCursor: page.nextCursor,
    };
  }
}

const unsubscribeCheckSchema = z.object({ valid: z.boolean() });

/** `/huy-nhan/[token]` and mail apps' one-click, through the `web` BFF. */
@ApiTags("campaigns")
@Controller("internal/v1/email-unsubscribes")
export class CampaignsPublicController {
  constructor(@Inject(CAMPAIGN_SERVICE) private readonly campaigns: CampaignService) {}

  @Get(":token")
  @AllowServices("web")
  @ApiOperation({ summary: "Whether an unsubscribe link is ours; changes nothing" })
  @ApiZodResponse(200, unsubscribeCheckSchema)
  async check(@Param("token", new ZodValidationPipe(unsubscribeTokenSchema)) token: string) {
    return { valid: await this.campaigns.checkUnsubscribe(token) };
  }

  @Post()
  @HttpCode(204)
  @AllowServices("web")
  @ApiOperation({ summary: "Unsubscribe the person behind a signed link" })
  @ApiZodResponse(204)
  async unsubscribe(@ZodBody(unsubscribeRequestSchema) body: UnsubscribeRequest) {
    await this.campaigns.unsubscribe(body.token);
  }
}
