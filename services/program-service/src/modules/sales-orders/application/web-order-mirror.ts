import type { TxContext } from "@lavieco/service-kit/ports";
import { normalizePhone } from "@lavieco/shared";
import { joinAddress, type Address } from "@lavieco/shared/geo";
import type { ShopOrderStatus } from "@lavieco/shared/shop";

import { salesPaymentOfShop, salesStatusOfShop, vnDay } from "../domain/sales-order";
import type { SalesOrderChanges, SalesOrderRepository } from "./ports";
import type { SalesSheetQueue } from "./sales-jobs";

/** What the mirror reads of a shop order (structural: no import of the shop module). */
export type MirrorableShopOrder = {
  id: string;
  publicCode: string;
  status: ShopOrderStatus;
  paymentMethod: "payos" | "cod";
  paidAt: Date | null;
  buyer: { fullName: string; phone: string };
  shipping: {
    method: "delivery" | "pickup";
    address: {
      line: string;
      ward: string;
      province: string;
      provinceCode?: number | null;
      wardCode?: number | null;
    } | null;
  };
  items: {
    title: string;
    optionLabel: string;
    unitPrice: number;
    quantity: number;
    madeToOrder?: boolean;
    leadTimeDays?: number | null;
  }[];
  subtotal: number;
  discount: { amount: number } | null;
  shippingFee: number;
  amount: number;
  createdAt: Date;
};

/** Never confirmed: an abandoned payOS link is not an order the team has to handle. */
const NOT_YET: readonly ShopOrderStatus[] = ["awaiting_payment", "expired"];

export interface WebOrderMirror {
  sync(order: MirrorableShopOrder, tx: TxContext): Promise<void>;
}

/**
 * Keeps the order book's copy of a website order (ADR-0030) in the same transaction as
 * the shop order: status, money and payment follow the shop; assignee, due day and the
 * team's note stay the team's. Abandoned payOS checkouts never show up.
 */
export class SalesWebOrderMirror implements WebOrderMirror {
  constructor(
    private readonly orders: SalesOrderRepository,
    private readonly sheet: SalesSheetQueue,
  ) {}

  async sync(order: MirrorableShopOrder, tx: TxContext) {
    if (NOT_YET.includes(order.status)) {
      const existing = await this.orders.findByShopOrderId(order.id, tx);
      if (!existing) return;
    }
    const mirrored = mirrorFields(order);
    const made = madeToOrderDue(order);
    await this.orders.upsertMirror(
      order.id,
      {
        ...mirrored,
        id: this.orders.newId(),
        code: order.publicCode,
        legacyCode: null,
        source: "web",
        shopOrderId: order.id,
        orderType: made ? "made_to_order" : "in_stock",
        channel: "website",
        // A first due day for pieces made on demand; the team may move it afterwards.
        dueDay: made?.dueDay ?? null,
        assignee: null,
        note: "",
        createdBy: null,
        updatedBy: null,
        deletedAt: null,
      },
      mirrored,
      tx,
    );
    await this.sheet.queue(tx);
  }
}

/** Ordered day + the longest lead time of its made-to-order lines (Asia/Ho_Chi_Minh). */
export function madeToOrderDue(order: MirrorableShopOrder): { dueDay: string } | null {
  const days = order.items.filter((item) => item.madeToOrder).map((item) => item.leadTimeDays ?? 7);
  if (days.length === 0) return null;
  const due = new Date(order.createdAt.getTime() + Math.max(...days) * 86_400_000);
  return { dueDay: vnDay(due) };
}

function addressOf(address: MirrorableShopOrder["shipping"]["address"]): Address | null {
  if (!address) return null;
  return {
    provinceCode: address.provinceCode ?? null,
    provinceName: address.province,
    wardCode: address.wardCode ?? null,
    wardName: address.ward,
    detail: address.line,
    full: joinAddress({
      detail: address.line,
      wardName: address.ward,
      provinceName: address.province,
    }),
  };
}

export function mirrorFields(
  order: MirrorableShopOrder,
): Omit<SalesOrderChanges, "orderType" | "channel" | "dueDay" | "assignee" | "note" | "updatedBy"> {
  return {
    customer: {
      name: order.buyer.fullName,
      phone: order.buyer.phone,
      phoneNormalized: normalizePhone(order.buyer.phone),
      address: order.shipping.method === "delivery" ? addressOf(order.shipping.address) : null,
    },
    items: order.items.map((item) => ({
      priceItemId: null,
      name: item.optionLabel ? `${item.title} (${item.optionLabel})` : item.title,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount?.amount ?? 0,
    total: order.amount,
    paymentMethod: order.paymentMethod === "cod" ? "cod" : "bank_transfer",
    paymentStatus: salesPaymentOfShop(order),
    status: salesStatusOfShop(order.status),
    orderDay: vnDay(order.createdAt),
  };
}
