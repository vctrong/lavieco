import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import {
  ApiZodResponse,
  CurrentPrincipal,
  RequirePermission,
  TOKEN_VERIFIER,
  ZodBody,
  ZodQuery,
  ZodValidationPipe,
  currentRequestId,
  type StaffPrincipal,
  type TokenVerifier,
} from "@lavieco/service-kit";
import { DomainError, objectIdSchema } from "@lavieco/shared";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";
import {
  shopOrderActionRequestSchema,
  shopOrderAdminSchema,
  shopOrderListQuerySchema,
  shopOrderListSchema,
  shopOverviewSchema,
  type ShopOrderActionRequest,
  type ShopOrderListQuery,
} from "@lavieco/shared/shop";

import {
  ShopOrderAdminService,
  type ShopOrderActor,
} from "../application/shop-order-admin-service";
import { SHOP_ORDER_ADMIN_SERVICE } from "../shop-orders.tokens";
import { toAdminOrderDto } from "./shop-order.mapper";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const idPipe = new ZodValidationPipe(objectIdSchema);
const exportQuerySchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });

const actorOf = (staff: StaffPrincipal): ShopOrderActor => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

/** Shop orders in the back office (UC-40): `order:read`, `order:fulfill`, `order:refund`, `order:export`. */
@ApiTags("shop-orders")
@Controller("internal/v1/shop")
export class ShopOrdersAdminController {
  constructor(
    @Inject(SHOP_ORDER_ADMIN_SERVICE) private readonly orders: ShopOrderAdminService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  @Get("overview")
  @RequirePermission("order:read")
  @ApiOperation({ summary: "Revenue, orders to handle, low stock" })
  @ApiZodResponse(200, shopOverviewSchema)
  overview() {
    return this.orders.overview();
  }

  @Get("orders")
  @RequirePermission("order:read")
  @ApiOperation({
    summary: "Shop orders (personal data), newest first; `view=todo` for the work list",
  })
  @ApiZodResponse(200, shopOrderListSchema)
  async list(@ZodQuery(shopOrderListQuerySchema) query: ShopOrderListQuery) {
    const page = await this.orders.list(query);
    return { items: page.items.map(toAdminOrderDto), nextCursor: page.nextCursor };
  }

  @Get("orders/export")
  @RequirePermission("order:export")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiProduces(XLSX)
  @ApiOperation({ summary: "Excel export of shop orders (personal data): step-up + audit" })
  async export(
    @ZodQuery(exportQuerySchema) query: { from: string; to: string },
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    const file = await this.orders.export(
      { from: new Date(query.from), to: new Date(query.to) },
      actorOf(staff),
    );
    return new StreamableFile(file.content, {
      type: XLSX,
      disposition: `attachment; filename="${file.fileName}"`,
      length: file.content.length,
    });
  }

  @Get("orders/:id")
  @RequirePermission("order:read")
  @ApiOperation({ summary: "One shop order with the actions its status allows" })
  @ApiZodResponse(200, shopOrderAdminSchema)
  async get(@Param("id", idPipe) id: string) {
    return toAdminOrderDto(await this.orders.get(id));
  }

  @Post("orders/:id/actions")
  @HttpCode(200)
  @RequirePermission("order:fulfill")
  @ApiOperation({
    summary: "Confirm, pack, ship, deliver, complete, cancel, return (refund: separate)",
  })
  @ApiZodResponse(200, shopOrderAdminSchema)
  async act(
    @Param("id", idPipe) id: string,
    @ZodBody(shopOrderActionRequestSchema) body: ShopOrderActionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    if (body.action === "refund") throw new DomainError("shop_order.invalid_action");
    return toAdminOrderDto(await this.orders.act(id, body, actorOf(staff)));
  }

  @Post("orders/:id/refund")
  @HttpCode(200)
  @RequirePermission("order:refund")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiOperation({ summary: "Record a manual refund (BR-15): step-up + audit" })
  @ApiZodResponse(200, shopOrderAdminSchema)
  async refund(
    @Param("id", idPipe) id: string,
    @ZodBody(shopOrderActionRequestSchema) body: ShopOrderActionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    return toAdminOrderDto(
      await this.orders.act(id, { ...body, action: "refund" }, actorOf(staff)),
    );
  }
}
