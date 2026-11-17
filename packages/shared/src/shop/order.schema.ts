import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { emailSchema } from "../identity/password";
import { mediaImageSchema } from "../media/media.schema";
import { cartLineSchema, cartTokenSchema } from "./cart.schema";

/**
 * Shop orders (UC-37, UC-40; docs/08 §7). payOS orders start `awaiting_payment`, cash
 * on delivery ones `awaiting_confirmation` (a call from the team).
 */
export const SHOP_ORDER_STATUSES = [
  "awaiting_payment",
  "awaiting_confirmation",
  "paid",
  "confirmed",
  "packing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
  "returned",
] as const;
export const shopOrderStatusSchema = z.enum(SHOP_ORDER_STATUSES);
export type ShopOrderStatus = z.infer<typeof shopOrderStatusSchema>;

export const SHIPPING_METHODS = ["delivery", "pickup"] as const;
export const shippingMethodSchema = z.enum(SHIPPING_METHODS);
export type ShippingMethod = z.infer<typeof shippingMethodSchema>;

export const SHOP_PAYMENT_METHODS = ["payos", "cod"] as const;
export const shopPaymentMethodSchema = z.enum(SHOP_PAYMENT_METHODS);
export type ShopPaymentMethod = z.infer<typeof shopPaymentMethodSchema>;

/** Staff actions on an order; which are allowed depends on its status (domain). */
export const SHOP_ORDER_ACTIONS = [
  "confirm",
  "mark_cod_paid",
  "pack",
  "ship",
  "deliver",
  "complete",
  "cancel",
  "refund",
  "return",
] as const;
export const shopOrderActionSchema = z.enum(SHOP_ORDER_ACTIONS);
export type ShopOrderAction = z.infer<typeof shopOrderActionSchema>;

/** Hard caps against fake holds (Q-S19). */
export const SHOP_ORDER_LIMITS = { linesMax: 50, pendingPerEmail: 3, noteMax: 500 } as const;

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+84|0)\d{9,10}$/, "Vietnamese phone number");

export const shippingAddressSchema = z.object({
  line: z.string().trim().min(3).max(200),
  ward: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const shopShippingInputSchema = z
  .object({
    method: shippingMethodSchema,
    recipientName: z.string().trim().min(2).max(100),
    recipientPhone: phoneSchema,
    address: shippingAddressSchema.nullable(),
    note: z.string().trim().max(SHOP_ORDER_LIMITS.noteMax).default(""),
  })
  .refine((value) => value.method === "pickup" || value.address !== null, {
    path: ["address"],
    message: "Address required for delivery",
  });
export type ShopShippingInput = z.infer<typeof shopShippingInputSchema>;

export const shopQuoteRequestSchema = z.object({
  cartToken: cartTokenSchema,
  shippingMethod: shippingMethodSchema,
  voucherCode: z.string().trim().toUpperCase().max(30).optional(),
  /** The buyer's email when known, for member-only or per-customer vouchers. */
  email: emailSchema.optional(),
});
export type ShopQuoteRequest = z.infer<typeof shopQuoteRequestSchema>;

export const shopQuoteSchema = z.object({
  lines: z.array(cartLineSchema),
  subtotal: z.number().int(),
  shippingFee: z.number().int(),
  discount: z.number().int(),
  amount: z.number().int(),
  voucher: z.object({ code: z.string(), amount: z.number().int() }).nullable(),
  /** The code was refused (one generic answer, BR-18). */
  voucherRefused: z.boolean(),
  codAvailable: z.boolean(),
  /** Some line changed (stock, price): the buyer must look again before paying. */
  hasIssues: z.boolean(),
});
export type ShopQuote = z.infer<typeof shopQuoteSchema>;

export const shopOrderCreateRequestSchema = z.object({
  cartToken: cartTokenSchema,
  /** identity-service email proof (`purpose: checkout`), BR-12. */
  verificationToken: z.string().min(1).max(4_000),
  buyer: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: phoneSchema,
  }),
  shipping: shopShippingInputSchema,
  paymentMethod: shopPaymentMethodSchema,
  voucherCode: z.string().trim().toUpperCase().max(30).optional(),
  dataConsent: z.literal(true),
  consentVersion: z.string().min(1).max(40),
});
export type ShopOrderCreateRequest = z.infer<typeof shopOrderCreateRequestSchema>;

export const shopOrderItemSchema = z.object({
  variantId: objectIdSchema,
  productSlug: z.string(),
  title: z.string(),
  optionLabel: z.string(),
  sku: z.string(),
  image: mediaImageSchema.nullable(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});
export type ShopOrderItem = z.infer<typeof shopOrderItemSchema>;

export const shopPaymentSchema = z.object({
  checkoutUrl: z.string(),
  qrCode: z.string(),
  bin: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  description: z.string(),
  expiresAt: isoDateTimeSchema,
});

export const shopOrderTrackingSchema = z.object({
  carrier: z.string().trim().max(60),
  code: z.string().trim().max(80),
});

const shopOrderCommon = {
  id: objectIdSchema,
  orderCode: z.number().int(),
  publicCode: z.string(),
  status: shopOrderStatusSchema,
  paymentMethod: shopPaymentMethodSchema,
  items: z.array(shopOrderItemSchema),
  subtotal: z.number().int(),
  discount: z.object({ code: z.string(), amount: z.number().int() }).nullable(),
  shippingFee: z.number().int(),
  amount: z.number().int(),
  shippingMethod: shippingMethodSchema,
  tracking: shopOrderTrackingSchema.nullable(),
  expiresAt: isoDateTimeSchema.nullable(),
  paidAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
};

/** What the holder of the order link sees (`/don-hang/[token]`): contact details masked. */
export const shopOrderPublicSchema = z.object({
  ...shopOrderCommon,
  buyerName: z.string(),
  emailMasked: z.string(),
  phoneMasked: z.string(),
  addressText: z.string(),
  payment: shopPaymentSchema.nullable(),
  returnDays: z.number().int(),
  statusHistory: z.array(z.object({ status: shopOrderStatusSchema, at: isoDateTimeSchema })),
});
export type ShopOrderPublic = z.infer<typeof shopOrderPublicSchema>;

export const shopOrderCreatedSchema = z.object({
  accessToken: z.string(),
  order: shopOrderPublicSchema,
});
export type ShopOrderCreated = z.infer<typeof shopOrderCreatedSchema>;

export const shopOrderLookupRequestSchema = z.object({
  verificationToken: z.string().min(1).max(4_000),
});
export const shopOrderLookupSchema = z.object({
  items: z.array(
    z.object({
      accessToken: z.string(),
      publicCode: z.string(),
      status: shopOrderStatusSchema,
      amount: z.number().int(),
      itemCount: z.number().int(),
      createdAt: isoDateTimeSchema,
    }),
  ),
});
export type ShopOrderLookup = z.infer<typeof shopOrderLookupSchema>;

// ---------------------------------------------------------------- admin

export const shopOrderAdminSchema = z.object({
  ...shopOrderCommon,
  buyer: z.object({ fullName: z.string(), email: z.string(), phone: z.string() }),
  shipping: z.object({
    method: shippingMethodSchema,
    recipientName: z.string(),
    recipientPhone: z.string(),
    address: shippingAddressSchema.nullable(),
    note: z.string(),
  }),
  userId: z.string().nullable(),
  flags: z.object({
    refundRequired: z.boolean(),
    amountMismatch: z.boolean(),
    latePayment: z.boolean(),
  }),
  refundNote: z.string(),
  statusHistory: z.array(
    z.object({
      status: shopOrderStatusSchema,
      at: isoDateTimeSchema,
      actorId: z.string().nullable(),
    }),
  ),
  allowedActions: z.array(shopOrderActionSchema),
  revision: z.number().int(),
});
export type ShopOrderAdmin = z.infer<typeof shopOrderAdminSchema>;

export const shopOrderListQuerySchema = cursorPageQuerySchema.extend({
  status: shopOrderStatusSchema.optional(),
  /** `todo`: what needs the team (confirm COD, pack, ship). */
  view: z.enum(["all", "todo"]).default("all"),
  q: z.string().trim().max(100).optional(),
});
export type ShopOrderListQuery = z.infer<typeof shopOrderListQuerySchema>;

export const shopOrderListSchema = cursorPageSchema(shopOrderAdminSchema);
export type ShopOrderList = z.infer<typeof shopOrderListSchema>;

export const shopOrderActionRequestSchema = z.object({
  action: shopOrderActionSchema,
  revision: z.number().int().min(1),
  tracking: shopOrderTrackingSchema.optional(),
  note: z.string().trim().max(SHOP_ORDER_LIMITS.noteMax).default(""),
  /** `cancel` / `return`: put the units back on the shelf. */
  restock: z.boolean().default(true),
});
export type ShopOrderActionRequest = z.infer<typeof shopOrderActionRequestSchema>;

export const shopOverviewSchema = z.object({
  revenue: z.object({ today: z.number().int(), week: z.number().int(), month: z.number().int() }),
  todo: z.object({
    awaitingConfirmation: z.number().int(),
    toPack: z.number().int(),
    toShip: z.number().int(),
    attention: z.number().int(),
  }),
  lowStock: z.number().int(),
});
export type ShopOverview = z.infer<typeof shopOverviewSchema>;
