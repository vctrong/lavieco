import type { PriceItem, SalesOrder } from "@lavieco/shared/sales";

import type { PriceItemRecord } from "../domain/price-item";
import { dueStateOf, type SalesOrderRecord } from "../domain/sales-order";

export function toSalesOrderDto(order: SalesOrderRecord, today: string): SalesOrder {
  return {
    id: order.id,
    code: order.code,
    legacyCode: order.legacyCode,
    source: order.source,
    shopOrderId: order.shopOrderId,
    orderType: order.orderType,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
    },
    channel: order.channel,
    items: order.items.map((item) => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    orderDay: order.orderDay,
    dueDay: order.dueDay,
    dueState: dueStateOf(order, today),
    assignee: order.assignee,
    note: order.note,
    createdBy: order.createdBy,
    updatedBy: order.updatedBy,
    deletedAt: order.deletedAt?.toISOString() ?? null,
    revision: order.revision,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toPriceItemDto(item: PriceItemRecord): PriceItem {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    active: item.active,
    note: item.note,
    sortOrder: item.sortOrder,
    revision: item.revision,
    updatedAt: item.updatedAt.toISOString(),
  };
}
