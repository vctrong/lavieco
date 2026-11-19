import { randomInt } from "node:crypto";

import { DomainError } from "@lavieco/shared";
import { findProvince, findWard } from "@lavieco/shared/geo";

import type {
  ShippingAddress,
  ShippingAddressInput,
  ShippingMethod,
  ShopOrderAction,
  ShopOrderStatus,
  ShopPaymentMethod,
  ShopSettingsInput,
} from "@lavieco/shared/shop";

import type { PaymentLink } from "../../orders";

export type ShopOrderItem = {
  productId: string;
  variantId: string;
  productSlug: string;
  title: string;
  optionLabel: string;
  sku: string;
  image: { mediaId: string; publicId: string; width: number; height: number; alt: string } | null;
  unitPrice: number;
  quantity: number;
  /** Made on demand: days to make it, snapshotted (sets the order book's due day). */
  madeToOrder?: boolean;
  leadTimeDays?: number | null;
  /** Snapshot of the brand's commission (‰) at order time; never public (BR-25). */
  partnerBrandId: string | null;
  commissionRate: number | null;
};

export type ShopOrderRecord = {
  id: string;
  orderCode: number;
  publicCode: string;
  userId: string | null;
  verificationId: string;
  /** PII, kept apart from the financial fields (DQ8). */
  buyer: { fullName: string; email: string; emailNormalized: string; phone: string };
  shipping: {
    method: ShippingMethod;
    recipientName: string;
    recipientPhone: string;
    address: ShippingAddress | null;
    note: string;
  };
  items: ShopOrderItem[];
  subtotal: number;
  discount: { voucherId: string; code: string; amount: number } | null;
  shippingFee: number;
  amount: number;
  paymentMethod: ShopPaymentMethod;
  status: ShopOrderStatus;
  stockState: "held" | "committed" | "released";
  expiresAt: Date | null;
  paidAt: Date | null;
  tracking: { carrier: string; code: string } | null;
  statusHistory: { status: ShopOrderStatus; at: Date; actorId: string | null }[];
  consent: { version: string; at: Date };
  flags: { refundRequired: boolean; amountMismatch: boolean; latePayment: boolean };
  payment: PaymentLink | null;
  refundNote: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Shop order codes live in their own range (11 digits) and ticket orders in theirs (10
 * digits): one payOS account, one webhook, and the code alone tells which settlement
 * applies (ADR-0028). No shared registry needed.
 */
export const SHOP_ORDER_CODE_MIN = 10_000_000_000;
export const newShopOrderCode = () => randomInt(SHOP_ORDER_CODE_MIN, 99_999_999_999);
export const isShopOrderCode = (orderCode: number) => orderCode >= SHOP_ORDER_CODE_MIN;

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/** `LVS-7K3Q9M`: what the buyer reads out on the phone. */
export function newPublicCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += CROCKFORD[randomInt(0, CROCKFORD.length)];
  return `LVS-${code}`;
}

/** Delivery fee from the settings (BR-21): pickup is free, then the free threshold. */
/**
 * Delivery fee (BR-21, computed here only): pickup is free, so is delivery to the wards
 * listed in the settings (the former Ninh Kiều district by default) and orders above the
 * free-delivery amount when one is set.
 */
export function shippingFeeOf(
  settings: ShopSettingsInput,
  method: ShippingMethod,
  subtotal: number,
  wardCode: number | null = null,
) {
  if (method === "pickup") return 0;
  if (wardCode !== null && settings.freeShippingWardCodes.includes(wardCode)) return 0;
  if (settings.freeShippingFrom !== null && subtotal >= settings.freeShippingFrom) return 0;
  return settings.shippingFee;
}

/** Q-S4: cash on delivery only up to the limit (200.000đ by default). */
export const codAllowed = (settings: ShopSettingsInput, amount: number) =>
  settings.cod.enabled && amount > 0 && amount <= settings.cod.maxAmount;

/** Statuses after which the goods are counted as sold. */
const COMMITTED: readonly ShopOrderStatus[] = [
  "paid",
  "confirmed",
  "packing",
  "shipped",
  "delivered",
  "completed",
];

/**
 * Which staff action is allowed in which status (UC-40). Cancelling after payment means
 * a manual refund (BR-15): the order goes to `cancelled` with `refundRequired`.
 */
const NEXT: Record<ShopOrderAction, { from: readonly ShopOrderStatus[]; to: ShopOrderStatus }> = {
  confirm: { from: ["awaiting_confirmation"], to: "confirmed" },
  mark_cod_paid: { from: ["shipped", "delivered", "confirmed", "packing"], to: "delivered" },
  pack: { from: ["paid", "confirmed"], to: "packing" },
  ship: { from: ["paid", "confirmed", "packing"], to: "shipped" },
  deliver: { from: ["shipped"], to: "delivered" },
  complete: { from: ["delivered"], to: "completed" },
  cancel: {
    from: ["awaiting_payment", "awaiting_confirmation", "paid", "confirmed", "packing"],
    to: "cancelled",
  },
  refund: {
    from: [
      "paid",
      "confirmed",
      "packing",
      "shipped",
      "delivered",
      "completed",
      "cancelled",
      "returned",
    ],
    to: "refunded",
  },
  return: { from: ["shipped", "delivered", "completed"], to: "returned" },
};

export function allowedActions(
  order: Pick<ShopOrderRecord, "status" | "paymentMethod" | "paidAt">,
): ShopOrderAction[] {
  return (Object.keys(NEXT) as ShopOrderAction[]).filter((action) => {
    if (!NEXT[action].from.includes(order.status)) return false;
    if (action === "mark_cod_paid") return order.paymentMethod === "cod" && order.paidAt === null;
    // Refund only when money came in.
    if (action === "refund") return order.paidAt !== null;
    return true;
  });
}

export const nextStatus = (action: ShopOrderAction) => NEXT[action].to;
export const isCommitted = (status: ShopOrderStatus) => COMMITTED.includes(status);

/** `tr***@gmail.com`, `***789`: the order link shows the buyer's details masked. */
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
export const maskPhone = (phone: string) => `***${phone.slice(-3)}`;

export function addressText(shipping: ShopOrderRecord["shipping"], pickupAddress: string) {
  if (shipping.method === "pickup") return pickupAddress;
  const a = shipping.address;
  return a ? [a.line, a.ward, a.province].filter(Boolean).join(", ") : "";
}

/** Names of the chosen province and ward, kept next to their codes on the order. */
export function resolveShippingAddress(input: ShippingAddressInput): ShippingAddress {
  const province = findProvince(input.provinceCode);
  const ward = findWard(input.provinceCode, input.wardCode);
  if (!province || ward === null) throw new DomainError("address.invalid");
  return {
    line: input.line,
    ward,
    province: province.name,
    provinceCode: province.code,
    wardCode: input.wardCode,
  };
}
