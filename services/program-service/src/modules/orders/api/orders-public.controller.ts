import { Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { AllowServices, ApiZodResponse, ZodBody, ZodValidationPipe } from "@lavieco/service-kit";
import {
  eventSlugSchema,
  orderAccessTokenSchema,
  publicEventAttendanceSchema,
  orderCreateRequestSchema,
  orderCreateResponseSchema,
  orderViewSchema,
  ticketLookupRequestSchema,
  ticketLookupResponseSchema,
  type OrderCreateRequest,
  type TicketLookupRequest,
} from "@lavieco/shared/events";

import { CheckoutService } from "../application/checkout-service";
import { EventAttendanceService } from "../application/event-attendance-service";
import { OrderSettlementService } from "../application/order-settlement-service";
import {
  CHECKOUT_SERVICE,
  EVENT_ATTENDANCE_SERVICE,
  ORDER_SETTLEMENT_SERVICE,
} from "../orders.tokens";
import { toLookupDto, toOrderView } from "./order.mapper";

const tokenPipe = new ZodValidationPipe(orderAccessTokenSchema);

/**
 * Checkout for visitors, called by the `web` BFF (docs/05 §5). Guests have no account:
 * an order is reached through its signed link only, never by its order code.
 */
@ApiTags("orders")
@Controller("internal/v1")
export class OrdersPublicController {
  constructor(
    @Inject(CHECKOUT_SERVICE) private readonly checkout: CheckoutService,
    @Inject(ORDER_SETTLEMENT_SERVICE) private readonly settlement: OrderSettlementService,
    @Inject(EVENT_ATTENDANCE_SERVICE) private readonly attendance: EventAttendanceService,
  ) {}

  @Get("published-events/:slug/attendance")
  @AllowServices("web")
  @ApiOperation({
    summary: "People who took part in an ended event (checked-in tickets, or approved count)",
  })
  @ApiZodResponse(200, publicEventAttendanceSchema)
  attendanceOf(@Param("slug", new ZodValidationPipe(eventSlugSchema)) slug: string) {
    return this.attendance.bySlug(slug);
  }

  @Post("orders")
  @HttpCode(201)
  @AllowServices("web")
  @ApiOperation({
    summary: "Hold seats after the email proof; free orders are paid and ticketed at once",
  })
  @ApiZodResponse(201, orderCreateResponseSchema)
  async create(@ZodBody(orderCreateRequestSchema) body: OrderCreateRequest) {
    const { accessToken, bundle } = await this.checkout.create(body);
    return { accessToken, order: toOrderView(bundle) };
  }

  @Get("order-links/:token")
  @AllowServices("web")
  @ApiOperation({ summary: "Order behind a signed link (payment page, /ve/[token])" })
  @ApiZodResponse(200, orderViewSchema)
  async get(@Param("token", tokenPipe) token: string) {
    return toOrderView(await this.checkout.getByToken(token));
  }

  @Post("order-links/:token/cancel")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "The buyer cancels a pending order; seats go back at once" })
  @ApiZodResponse(200, orderViewSchema)
  async cancel(@Param("token", tokenPipe) token: string) {
    return toOrderView(await this.checkout.cancelByToken(token));
  }

  @Post("order-links/:token/reconcile")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({
    summary: "Back from payOS with the order still pending: ask payOS (throttled, display only)",
  })
  @ApiZodResponse(200, orderViewSchema)
  async reconcile(@Param("token", tokenPipe) token: string) {
    // returnUrl never confirms a payment by itself: only payOS's own answer does (BR-15).
    const { order } = await this.checkout.getByToken(token);
    await this.settlement.reconcile(order.id, { publicCall: true });
    return toOrderView(await this.checkout.load(order.id));
  }

  @Post("ticket-lookups")
  @HttpCode(200)
  @AllowServices("web")
  @ApiOperation({ summary: "Paid orders of an email that passed OTP (purpose ticket_lookup)" })
  @ApiZodResponse(200, ticketLookupResponseSchema)
  async lookup(@ZodBody(ticketLookupRequestSchema) body: TicketLookupRequest) {
    return toLookupDto(await this.checkout.lookup(body.verificationToken));
  }
}
