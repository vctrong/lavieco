import type { ShopOrderAdmin, ShopOrderPublic } from "@lavieco/shared/shop";

import {
  addressText,
  allowedActions,
  maskEmail,
  maskPhone,
  type ShopOrderRecord,
} from "../domain/shop-order";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function common(order: ShopOrderRecord) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    publicCode: order.publicCode,
    status: order.status,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      variantId: item.variantId,
      productSlug: item.productSlug,
      title: item.title,
      optionLabel: item.optionLabel,
      sku: item.sku,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
    })),
    subtotal: order.subtotal,
    discount: order.discount ? { code: order.discount.code, amount: order.discount.amount } : null,
    shippingFee: order.shippingFee,
    amount: order.amount,
    shippingMethod: order.shipping.method,
    tracking: order.tracking,
    expiresAt: iso(order.expiresAt),
    paidAt: iso(order.paidAt),
    createdAt: order.createdAt.toISOString(),
  };
}

/** The holder of the link sees the order, the buyer's name, and masked contact details. */
export function toPublicOrderDto(
  order: ShopOrderRecord,
  settings: { pickupAddress: string; returnDays: number },
): ShopOrderPublic {
  const payment =
    order.status === "awaiting_payment" && order.payment
      ? {
          checkoutUrl: order.payment.checkoutUrl,
          qrCode: order.payment.qrCode,
          bin: order.payment.bin,
          accountNumber: order.payment.accountNumber,
          accountName: order.payment.accountName,
          description: order.payment.description,
          expiresAt: order.payment.expiresAt.toISOString(),
        }
      : null;
  return {
    ...common(order),
    buyerName: order.buyer.fullName,
    emailMasked: maskEmail(order.buyer.email),
    phoneMasked: maskPhone(order.buyer.phone),
    addressText: addressText(order.shipping, settings.pickupAddress),
    payment,
    returnDays: settings.returnDays,
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      at: new Date(entry.at).toISOString(),
    })),
  };
}

export function toAdminOrderDto(order: ShopOrderRecord): ShopOrderAdmin {
  return {
    ...common(order),
    buyer: { fullName: order.buyer.fullName, email: order.buyer.email, phone: order.buyer.phone },
    shipping: order.shipping,
    userId: order.userId,
    flags: order.flags,
    refundNote: order.refundNote,
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      at: new Date(entry.at).toISOString(),
      actorId: entry.actorId,
    })),
    allowedActions: allowedActions(order),
    revision: order.revision,
  };
}
