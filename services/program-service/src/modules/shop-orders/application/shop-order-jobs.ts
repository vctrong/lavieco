/** Outbox jobs of shop orders; payloads carry ids only, never personal data. */
export const SHOP_ORDER_JOBS = {
  /** `{ orderId, kind: placed | paid | shipped | cancelled }` → email to the buyer. */
  email: "shop_order.email",
  /** `{ orderId, kind: new | paid | attention }` → Web Push to staff (ADR-0027). */
  alert: "shop_order.alert",
  /** `{ orderId }` → cancel the payOS link. */
  cancelLink: "shop_order.cancel_link",
} as const;
