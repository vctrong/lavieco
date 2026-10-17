import { Controller, Get, Headers, HttpCode, Inject, Param, Post } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
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
  orderDetailSchema,
  orderListQuerySchema,
  orderListSchema,
  orderRefundRequestSchema,
  type OrderListQuery,
  type OrderRefundRequest,
} from "@lavieco/shared/events";
import { STEP_UP_HEADER } from "@lavieco/shared/identity";

import { OrderAdminService } from "../application/order-admin-service";
import { ORDER_ADMIN_SERVICE } from "../orders.tokens";
import { toOrderDetailDto, toOrderListItemDto } from "./order.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);

/** Orders in the back office (`admin`, staff token). */
@ApiTags("orders-admin")
@Controller("internal/v1/orders")
export class OrdersAdminController {
  constructor(
    @Inject(ORDER_ADMIN_SERVICE) private readonly orders: OrderAdminService,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  @Get()
  @RequirePermission("order:read")
  @ApiOperation({ summary: "Orders, filtered by event, status or flag; newest first" })
  @ApiZodResponse(200, orderListSchema)
  async list(@ZodQuery(orderListQuerySchema) query: OrderListQuery) {
    const page = await this.orders.list(query);
    return {
      items: page.items.map(({ order, event }) => toOrderListItemDto(order, event)),
      nextCursor: page.nextCursor,
    };
  }

  @Get(":id")
  @RequirePermission("order:read")
  @ApiOperation({ summary: "Order detail: tickets, answers, payment events" })
  @ApiZodResponse(200, orderDetailSchema)
  async get(@Param("id", idPipe) id: string) {
    return toOrderDetailDto(await this.orders.detail(id));
  }

  @Post(":id/reconcile")
  @HttpCode(200)
  @RequirePermission("order:read")
  @ApiOperation({ summary: "Kiểm tra lại thanh toán: ask payOS, settle like the webhook" })
  @ApiZodResponse(200, orderDetailSchema)
  async reconcile(@Param("id", idPipe) id: string) {
    return toOrderDetailDto(await this.orders.reconcile(id));
  }

  @Post(":id/resend-tickets")
  @HttpCode(204)
  @RequirePermission("order:read")
  @ApiOperation({ summary: "Gửi lại vé: email the tickets of a paid order again" })
  @ApiZodResponse(204)
  async resend(@Param("id", idPipe) id: string) {
    await this.orders.resendTickets(id);
  }

  @Post(":id/refund")
  @HttpCode(200)
  @RequirePermission("order:refund")
  @ApiHeader({ name: STEP_UP_HEADER, required: true, description: "Step-up token (ADR-0021)" })
  @ApiOperation({
    summary: "Đánh dấu đã hoàn tiền (manual transfer done): tickets void, seats back. Step-up",
  })
  @ApiZodResponse(200, orderDetailSchema)
  async refund(
    @Param("id", idPipe) id: string,
    @ZodBody(orderRefundRequestSchema) body: OrderRefundRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
    @Headers(STEP_UP_HEADER) stepUpToken: string | undefined,
  ) {
    await this.tokens.verifyStepUp(stepUpToken, staff);
    const detail = await this.orders.markRefunded(id, body, {
      userId: staff.userId,
      roles: staff.roles,
      requestId: currentRequestId() ?? null,
    });
    return toOrderDetailDto(detail);
  }
}
