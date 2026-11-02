import { Controller, Get, HttpCode, Inject, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
} from "@lavieco/service-kit";
import { objectIdSchema } from "@lavieco/shared";
import {
  voucherCreateRequestSchema,
  voucherListQuerySchema,
  voucherListSchema,
  voucherSchema,
  voucherStatusRequestSchema,
  voucherUpdateRequestSchema,
  type VoucherCreateRequest,
  type VoucherListQuery,
  type VoucherStatusRequest,
  type VoucherUpdateRequest,
  type VoucherView,
} from "@lavieco/shared/events";

import { VoucherAdminService } from "../application/voucher-admin-service";
import type { VoucherRecord } from "../domain/voucher";
import { VOUCHER_ADMIN_SERVICE } from "../vouchers.tokens";

const idPipe = new ZodValidationPipe(objectIdSchema);

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export function toVoucherDto(voucher: VoucherRecord): VoucherView {
  return {
    ...voucher,
    startAt: iso(voucher.startAt),
    endAt: iso(voucher.endAt),
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  };
}

const actorOf = (staff: StaffPrincipal) => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** "Ưu đãi" in the back office. Every route needs `voucher:write`: the allowlist is PII. */
@ApiTags("vouchers")
@Controller("internal/v1/vouchers")
export class VouchersAdminController {
  constructor(@Inject(VOUCHER_ADMIN_SERVICE) private readonly vouchers: VoucherAdminService) {}

  @Get()
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "Vouchers, filtered by scope, status, or the event they can apply to" })
  @ApiZodResponse(200, voucherListSchema)
  async list(@ZodQuery(voucherListQuerySchema) query: VoucherListQuery) {
    const page = await this.vouchers.list(query);
    return { items: page.items.map(toVoucherDto), nextCursor: page.nextCursor };
  }

  @Post()
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "Create a voucher" })
  @ApiZodResponse(201, voucherSchema)
  async create(
    @ZodBody(voucherCreateRequestSchema) body: VoucherCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toVoucherDto(await this.vouchers.create(body, actorOf(staff)));
  }

  @Get(":id")
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "One voucher" })
  @ApiZodResponse(200, voucherSchema)
  async get(@Param("id", idPipe) id: string) {
    return toVoucherDto(await this.vouchers.get(id));
  }

  @Patch(":id")
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "Edit a voucher (the code is frozen once used)" })
  @ApiZodResponse(200, voucherSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(voucherUpdateRequestSchema) body: VoucherUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toVoucherDto(await this.vouchers.update(id, body, actorOf(staff)));
  }

  @Post(":id/status")
  @HttpCode(200)
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "Pause, resume or archive a voucher" })
  @ApiZodResponse(200, voucherSchema)
  async setStatus(
    @Param("id", idPipe) id: string,
    @ZodBody(voucherStatusRequestSchema) body: VoucherStatusRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toVoucherDto(await this.vouchers.setStatus(id, body, actorOf(staff)));
  }

  @Post(":id/duplicate")
  @RequirePermission("voucher:write")
  @ApiOperation({ summary: "A paused copy of a voucher, with fresh counters" })
  @ApiZodResponse(201, voucherSchema)
  async duplicate(@Param("id", idPipe) id: string, @CurrentPrincipal() staff: StaffPrincipal) {
    return toVoucherDto(await this.vouchers.duplicate(id, actorOf(staff)));
  }
}
