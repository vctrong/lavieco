import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import {
  AllowServices,
  ApiZodResponse,
  CurrentPrincipal,
  RequireMember,
  ZodBody,
  ZodValidationPipe,
  type MemberPrincipal,
} from "@lavieco/service-kit";
import {
  shopOrderCreateRequestSchema,
  shopOrderCreatedSchema,
  shopOrderLookupRequestSchema,
  shopOrderLookupSchema,
  shopOrderPublicSchema,
  shopQuoteRequestSchema,
  shopQuoteSchema,
  type ShopOrderCreateRequest,
  type ShopQuoteRequest,
} from "@lavieco/shared/shop";

import type { CatalogRepository } from "../../shop-catalog";
import { CATALOG_REPOSITORY } from "../../shop-catalog";
import { ShopCheckoutService } from "../application/shop-checkout-service";
import { ShopSettlementService } from "../application/shop-settlement-service";
import type { ShopOrderRecord } from "../domain/shop-order";
import { SHOP_CHECKOUT_SERVICE, SHOP_SETTLEMENT_SERVICE } from "../shop-orders.tokens";
import { toPublicOrderDto } from "./shop-order.mapper";

const tokenPipe = new ZodValidationPipe(z.string().min(20).max(200));

/** Checkout, order page, lookup and "Đơn hàng của tôi" of `web` (UC-37). */
@ApiTags("shop-orders")
@Controller("internal/v1/shop")
export class ShopOrdersPublicController {
  constructor(
    @Inject(SHOP_CHECKOUT_SERVICE) private readonly checkout: ShopCheckoutService,
    @Inject(SHOP_SETTLEMENT_SERVICE) private readonly settlement: ShopSettlementService,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
  ) {}

  private async dto(order: ShopOrderRecord) {
    const settings = await this.catalog.getSettings();
    return toPublicOrderDto(order, {
      pickupAddress: settings.pickup.address,
      returnDays: settings.returnDays,
    });
  }

  @Post("public/checkout/quote")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Price the cart: delivery, voucher, COD availability (nothing held)" })
  @ApiZodResponse(200, shopQuoteSchema)
  quote(@ZodBody(shopQuoteRequestSchema) body: ShopQuoteRequest) {
    return this.checkout.quote(body);
  }

  @Post("public/orders")
  @AllowServices("web")
  @ApiOperation({ summary: "Place an order: email proof, stock held, payOS link or COD (UC-37)" })
  @ApiZodResponse(201, shopOrderCreatedSchema)
  async create(@ZodBody(shopOrderCreateRequestSchema) body: ShopOrderCreateRequest) {
    const { order, accessToken } = await this.checkout.create(body);
    return { accessToken, order: await this.dto(order) };
  }

  @Get("public/orders/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "The order behind a signed link; asks payOS when still unpaid" })
  @ApiZodResponse(200, shopOrderPublicSchema)
  async byToken(@Param("token", tokenPipe) token: string) {
    const order = await this.settlement.reconcile(await this.checkout.byToken(token));
    return this.dto(order);
  }

  @Post("public/orders/:token/cancel")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "The buyer gives up an unpaid payOS order: stock released at once" })
  @ApiZodResponse(200, shopOrderPublicSchema)
  async cancel(@Param("token", tokenPipe) token: string) {
    const { order } = await this.checkout.cancelByBuyer(token);
    return this.dto(order);
  }

  @Post("public/orders/lookup")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Orders of an email proven by OTP (`ticket_lookup`)" })
  @ApiZodResponse(200, shopOrderLookupSchema)
  async lookup(@ZodBody(shopOrderLookupRequestSchema) body: { verificationToken: string }) {
    return { items: (await this.checkout.lookup(body.verificationToken)).map(summary) };
  }

  @Get("me/orders")
  @RequireMember()
  @ApiOperation({ summary: "Orders of the signed-in member" })
  @ApiZodResponse(200, shopOrderLookupSchema)
  async mine(@CurrentPrincipal() member: MemberPrincipal) {
    return { items: (await this.checkout.listForMember(member.userId)).map(summary) };
  }
}

function summary({ order, accessToken }: { order: ShopOrderRecord; accessToken: string }) {
  return {
    accessToken,
    publicCode: order.publicCode,
    status: order.status,
    amount: order.amount,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: order.createdAt.toISOString(),
  };
}
