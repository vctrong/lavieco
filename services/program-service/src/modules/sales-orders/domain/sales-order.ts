import { DomainError } from "@lavieco/shared";
import type { Address } from "@lavieco/shared/geo";
import type {
  SalesChannel,
  SalesOrderItemInput,
  SalesOrderSource,
  SalesOrderStatus,
  SalesOrderType,
  SalesPaymentMethod,
  SalesPaymentStatus,
  StaffRef,
} from "@lavieco/shared/sales";
import type { ShopOrderStatus } from "@lavieco/shared/shop";

export type SalesOrderItemRecord = {
  priceItemId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type SalesOrderRecord = {
  id: string;
  code: string;
  legacyCode: string | null;
  source: SalesOrderSource;
  shopOrderId: string | null;
  orderType: SalesOrderType;
  customer: {
    name: string;
    phone: string;
    phoneNormalized: string | null;
    address: Address | null;
  };
  channel: SalesChannel;
  items: SalesOrderItemRecord[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: SalesPaymentMethod | null;
  paymentStatus: SalesPaymentStatus;
  status: SalesOrderStatus;
  orderDay: string | null;
  dueDay: string | null;
  assignee: StaffRef | null;
  note: string;
  createdBy: StaffRef | null;
  updatedBy: StaffRef | null;
  deletedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

/** Statuses still on the team's plate: what "trễ hạn" and the due colours look at. */
export const OPEN_STATUSES: readonly SalesOrderStatus[] = ["new", "in_progress", "shipping"];
/** "Cần làm": not started or being made. */
export const TODO_STATUSES: readonly SalesOrderStatus[] = ["new", "in_progress"];
/** Money not fully in yet. */
export const OUTSTANDING_PAYMENTS: readonly SalesPaymentStatus[] = ["unpaid", "deposit_paid"];

const VN_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today as `YYYY-MM-DD` in Asia/Ho_Chi_Minh (docs/03 §1.2). */
export const vnDay = (at: Date) => VN_DAY.format(at);

/** `LV-0001`: manual orders, numbered in creation order (counter). */
export function manualOrderCode(seq: number): string {
  return `LV-${String(seq).padStart(4, "0")}`;
}

export type Totals = { subtotal: number; shippingFee: number; discount: number; total: number };

/**
 * `subtotal = Σ unitPrice × quantity`, `total = subtotal + shippingFee − discount`.
 * Always computed here, never taken from the client.
 */
export function computeTotals(
  items: readonly Pick<SalesOrderItemInput, "unitPrice" | "quantity">[],
  shippingFee: number,
  discount: number,
): Totals {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (discount > subtotal + shippingFee) throw new DomainError("sales_order.totals_invalid");
  return { subtotal, shippingFee, discount, total: subtotal + shippingFee - discount };
}

/** A made-to-order piece needs a promised day, unless the order was cancelled. */
export function assertDueDay(
  orderType: SalesOrderType,
  status: SalesOrderStatus,
  dueDay: string | null,
) {
  if (orderType === "made_to_order" && status !== "cancelled" && dueDay === null)
    throw new DomainError("sales_order.due_day_required");
}

export type DueState = "none" | "later" | "today" | "overdue";

/** Red when late, orange when due today; closed orders are never late. */
export function dueStateOf(
  order: Pick<SalesOrderRecord, "dueDay" | "status">,
  today: string,
): DueState {
  if (order.dueDay === null || !OPEN_STATUSES.includes(order.status)) return "none";
  if (order.dueDay < today) return "overdue";
  return order.dueDay === today ? "today" : "later";
}

/** Status of the order book for a website order (its own machine has twelve). */
export function salesStatusOfShop(status: ShopOrderStatus): SalesOrderStatus {
  switch (status) {
    case "awaiting_payment":
    case "awaiting_confirmation":
    case "paid":
    case "confirmed":
      return "new";
    case "packing":
      return "in_progress";
    case "shipped":
      return "shipping";
    case "delivered":
    case "completed":
      return "completed";
    case "cancelled":
    case "expired":
    case "refunded":
    case "returned":
      return "cancelled";
  }
}

/** Payment of a website order: payOS orders are paid once settled, COD once collected. */
export function salesPaymentOfShop(order: {
  status: ShopOrderStatus;
  paidAt: Date | null;
}): SalesPaymentStatus {
  if (order.status === "refunded") return "unpaid";
  return order.paidAt ? "paid" : "unpaid";
}
