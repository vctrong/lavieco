import { Controller, Get, HttpCode, Inject, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import {
  handbookDraftCreateSchema,
  handbookOverviewSchema,
  handbookPageUpdateSchema,
  handbookPreviewTokenSchema,
  handbookPublishRequestSchema,
  handbookPublishResultSchema,
  handbookRestoreRequestSchema,
  handbookRevisionRequestSchema,
  handbookStructureUpdateSchema,
  handbookVersionSchema,
  type HandbookDraftCreate,
  type HandbookPageUpdate,
  type HandbookPublishRequest,
  type HandbookRestoreRequest,
  type HandbookRevisionRequest,
  type HandbookStructureUpdate,
} from "@lavieco/shared/content";

import type { EditorActor, HandbookEditor } from "../application/handbook-editor";
import { HANDBOOK_EDITOR } from "../handbook.tokens";
import { toOverviewDto, toSummaryDto, toVersionDto } from "./handbook.mapper";

const pageIdPipe = new ZodValidationPipe(z.uuid());

const actorOf = (staff: StaffPrincipal, name = ""): EditorActor => ({
  userId: staff.userId,
  name,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** "Cẩm nang" in the back office (UC-22, ADR-0029), called by `admin` with a staff token. */
@ApiTags("handbook")
@Controller("internal/v1/handbook")
export class HandbookAdminController {
  constructor(@Inject(HANDBOOK_EDITOR) private readonly editor: HandbookEditor) {}

  @Get()
  @RequirePermission("handbook:read")
  @ApiOperation({ summary: "Draft, published version and history of the handbook" })
  @ApiZodResponse(200, handbookOverviewSchema)
  async overview() {
    return toOverviewDto(await this.editor.overview());
  }

  @Post("draft")
  @HttpCode(201)
  @RequirePermission("handbook:write")
  @ApiOperation({ summary: "Start a draft from the published version (one draft at a time)" })
  @ApiZodResponse(201, handbookVersionSchema)
  async startDraft(
    @ZodBody(handbookDraftCreateSchema) body: HandbookDraftCreate,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toVersionDto(await this.editor.startDraft(actorOf(staff, body.actorName)));
  }

  @Put("draft/structure")
  @RequirePermission("handbook:write")
  @ApiOperation({
    summary: "Title, chapters and page order of the draft; omitted pages are removed",
  })
  @ApiZodResponse(200, handbookVersionSchema)
  async structure(@ZodBody(handbookStructureUpdateSchema) body: HandbookStructureUpdate) {
    return toVersionDto(await this.editor.updateStructure(body));
  }

  @Patch("draft/pages/:pageId")
  @RequirePermission("handbook:write")
  @ApiOperation({ summary: "Title, alt, text and hotspots of one draft page" })
  @ApiZodResponse(200, handbookVersionSchema)
  async page(
    @Param("pageId", pageIdPipe) pageId: string,
    @ZodBody(handbookPageUpdateSchema) body: HandbookPageUpdate,
  ) {
    return toVersionDto(await this.editor.updatePage(pageId, body));
  }

  @Post("draft/discard")
  @HttpCode(204)
  @RequirePermission("handbook:write")
  @ApiOperation({ summary: "Discard the draft (kept in history, audited)" })
  @ApiZodResponse(204)
  async discard(
    @ZodBody(handbookRevisionRequestSchema) body: HandbookRevisionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    await this.editor.discardDraft(body.revision, actorOf(staff));
  }

  @Post("draft/publish")
  @RequirePermission("handbook:publish")
  @ApiOperation({ summary: "Publish the draft with a release note (BR-26: no second reviewer)" })
  @ApiZodResponse(200, handbookPublishResultSchema)
  @HttpCode(200)
  async publish(
    @ZodBody(handbookPublishRequestSchema) body: HandbookPublishRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    const result = await this.editor.publish(body, actorOf(staff, body.actorName));
    return { version: toSummaryDto(result.version, true), warnings: result.warnings };
  }

  @Post("restore")
  @RequirePermission("handbook:publish")
  @ApiOperation({ summary: "Publish a copy of an earlier version as a new version" })
  @ApiZodResponse(200, handbookPublishResultSchema)
  @HttpCode(200)
  async restore(
    @ZodBody(handbookRestoreRequestSchema) body: HandbookRestoreRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    const result = await this.editor.restore(body, actorOf(staff, body.actorName));
    return { version: toSummaryDto(result.version, true), warnings: result.warnings };
  }

  @Post("draft/preview-tokens")
  @HttpCode(201)
  @RequirePermission("handbook:read")
  @ApiOperation({ summary: "10-minute token to read the draft on the public site (noindex)" })
  @ApiZodResponse(201, handbookPreviewTokenSchema)
  async previewToken(@CurrentPrincipal() staff: StaffPrincipal) {
    const { token, expiresAt } = await this.editor.createPreviewToken(actorOf(staff));
    return { token, expiresAt: expiresAt.toISOString() };
  }
}
