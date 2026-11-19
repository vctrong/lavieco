import { Controller, Get, HttpCode, Inject, Param, Patch, Post, Put } from "@nestjs/common";
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
  salesAssigneeListSchema,
  salesCustomerLookupQuerySchema,
  salesCustomerLookupSchema,
  salesOrderBulkResultSchema,
  salesOrderBulkStatusRequestSchema,
  salesOrderInputSchema,
  salesOrderListQuerySchema,
  salesOrderListSchema,
  salesOrderQuickUpdateRequestSchema,
  salesOrderRevisionRequestSchema,
  salesOrderSchema,
  salesOrderTeamFieldsRequestSchema,
  salesOrderUpdateRequestSchema,
  salesSummaryQuerySchema,
  salesSummarySchema,
  type SalesOrderBulkStatusRequest,
  type SalesOrderInput,
  type SalesOrderListQuery,
  type SalesOrderQuickUpdateRequest,
  type SalesOrderRevisionRequest,
  type SalesOrderTeamFieldsRequest,
  type SalesOrderUpdateRequest,
} from "@lavieco/shared/sales";

import type { SalesActor, SalesOrderService } from "../application/sales-order-service";
import { vnDay } from "../domain/sales-order";
import { SALES_ORDER_SERVICE } from "../sales-orders.tokens";
import { toSalesOrderDto } from "./sales.mapper";

const idPipe = new ZodValidationPipe(objectIdSchema);

export const salesActorOf = (staff: StaffPrincipal): SalesActor => ({
  userId: staff.userId,
  roles: staff.roles,
  requestId: currentRequestId() ?? null,
});

const dto = (order: Parameters<typeof toSalesOrderDto>[0]) =>
  toSalesOrderDto(order, vnDay(new Date()));

/**
 * "Đơn hàng" in the back office (UC-41..44, ADR-0030). Designed for the screens and, later,
 * a chat bot: filters by status, overdue, unpaid; one summary call.
 */
@ApiTags("sales")
@Controller("internal/v1/sales")
export class SalesOrdersAdminController {
  constructor(@Inject(SALES_ORDER_SERVICE) private readonly orders: SalesOrderService) {}

  @Get("orders")
  @RequirePermission("sales:read")
  @ApiOperation({ summary: "Orders with quick views, filters, search, sort and pagination" })
  @ApiZodResponse(200, salesOrderListSchema)
  async list(@ZodQuery(salesOrderListQuerySchema) query: SalesOrderListQuery) {
    const now = new Date();
    const page = await this.orders.list(query, now);
    return { ...page, items: page.items.map((order) => toSalesOrderDto(order, vnDay(now))) };
  }

  @Get("summary")
  @RequirePermission("sales:read")
  @ApiOperation({ summary: "Counts by status and view, money not yet in, revenue by month" })
  @ApiZodResponse(200, salesSummarySchema)
  summary(@ZodQuery(salesSummaryQuerySchema) query: { months: number }) {
    return this.orders.summary(query.months);
  }

  @Get("customers")
  @RequirePermission("sales:read")
  @ApiOperation({ summary: "Last known name and address of a phone number (prefill)" })
  @ApiZodResponse(200, salesCustomerLookupSchema)
  async customer(@ZodQuery(salesCustomerLookupQuerySchema) query: { phone: string }) {
    return { customer: await this.orders.lookupCustomer(query.phone) };
  }

  @Get("assignees")
  @RequirePermission("sales:read")
  @ApiOperation({ summary: "Active staff accounts that can be assigned an order" })
  @ApiZodResponse(200, salesAssigneeListSchema)
  async assignees() {
    return { items: await this.orders.assignees() };
  }

  @Get("orders/:id")
  @RequirePermission("sales:read")
  @ApiZodResponse(200, salesOrderSchema)
  async get(@Param("id", idPipe) id: string) {
    return dto(await this.orders.get(id));
  }

  @Post("orders")
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Create a manual order (code LV-0001…, totals computed here)" })
  @ApiZodResponse(201, salesOrderSchema)
  async create(
    @ZodBody(salesOrderInputSchema) body: SalesOrderInput,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.create(body, salesActorOf(staff)));
  }

  @Put("orders/:id")
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Edit a manual order (website orders: team fields only)" })
  @ApiZodResponse(200, salesOrderSchema)
  async update(
    @Param("id", idPipe) id: string,
    @ZodBody(salesOrderUpdateRequestSchema) body: SalesOrderUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.update(id, body, salesActorOf(staff)));
  }

  @Patch("orders/:id/team")
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Assignee, due day and note, on any order" })
  @ApiZodResponse(200, salesOrderSchema)
  async team(
    @Param("id", idPipe) id: string,
    @ZodBody(salesOrderTeamFieldsRequestSchema) body: SalesOrderTeamFieldsRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.updateTeamFields(id, body, salesActorOf(staff)));
  }

  @Patch("orders/:id/status")
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Change status and/or payment status in one tap" })
  @ApiZodResponse(200, salesOrderSchema)
  async quick(
    @Param("id", idPipe) id: string,
    @ZodBody(salesOrderQuickUpdateRequestSchema) body: SalesOrderQuickUpdateRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.quickUpdate(id, body, salesActorOf(staff)));
  }

  @Post("orders/bulk-status")
  @HttpCode(200)
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Same status on several manual orders (website ones are skipped)" })
  @ApiZodResponse(200, salesOrderBulkResultSchema)
  bulk(
    @ZodBody(salesOrderBulkStatusRequestSchema) body: SalesOrderBulkStatusRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return this.orders.bulkStatus(body, salesActorOf(staff));
  }

  @Post("orders/:id/delete")
  @HttpCode(200)
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Soft delete (hidden by default, can be restored)" })
  @ApiZodResponse(200, salesOrderSchema)
  async remove(
    @Param("id", idPipe) id: string,
    @ZodBody(salesOrderRevisionRequestSchema) body: SalesOrderRevisionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.remove(id, body.revision, salesActorOf(staff)));
  }

  @Post("orders/:id/restore")
  @HttpCode(200)
  @RequirePermission("sales:write")
  @ApiOperation({ summary: "Bring a deleted order back" })
  @ApiZodResponse(200, salesOrderSchema)
  async restore(
    @Param("id", idPipe) id: string,
    @ZodBody(salesOrderRevisionRequestSchema) body: SalesOrderRevisionRequest,
    @CurrentPrincipal() staff: StaffPrincipal,
  ) {
    return dto(await this.orders.restore(id, body.revision, salesActorOf(staff)));
  }
}
