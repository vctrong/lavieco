import { Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
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
  priceItemCreateRequestSchema,
  priceItemListSchema,
  priceItemSchema,
  priceItemUpdateRequestSchema,
  type PriceItemCreateRequest,
  type PriceItemUpdateRequest,
} from "@lavieco/shared/sales";

import type { PriceListService } from "../application/price-list-service";
import { PRICE_LIST_SERVICE } from "../sales-orders.tokens";
import { salesActorOf } from "./sales-orders-admin.controller";
import { toPriceItemDto } from "./sales.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);

/** "Danh mục đơn giá" (ADR-0030): edited inline, switched on and off, never deleted. */
@ApiTags("sales")
@Controller("internal/v1/sales/price-items")
export class PriceListAdminController {
  constructor(@Inject(PRICE_LIST_SERVICE) private readonly prices: PriceListService) {}

  @Get()
  @RequirePermission("sales:read")
  @ApiOperation({ summary: "The whole price list, inactive entries included" })
  @ApiZodResponse(200, priceItemListSchema)
  async list() {
    return { items: (await this.prices.list()).map(toPriceItemDto) };
  }

  @Post()
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Add a piece to the price list" })
  @ApiZodResponse(201, priceItemSchema)
  async create(
    @ZodBody(priceItemCreateRequestSchema) body: PriceItemCreateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toPriceItemDto(await this.prices.create(body, salesActorOf(staff)));
  }

  @Patch(":id")
  @RequirePermission("sales:write")
  @ApiOperation({
    summary: "Change name, price, note, order or on-sale (existing orders keep theirs)",
  })
  @ApiZodResponse(200, priceItemSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(priceItemUpdateRequestSchema) body: PriceItemUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return toPriceItemDto(await this.prices.update(id, body, salesActorOf(staff)));
  }
}
