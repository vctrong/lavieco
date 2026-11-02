import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { emailSchema } from "../identity/password";
import { ORDER_LIMITS, orderItemInputSchema } from "./order.schema";

export const VOUCHER_LIMITS = {
  codeMax: 30,
  nameMax: 120,
  descriptionMax: 500,
  allowlistMax: 500,
  scopedIdsMax: 50,
  perCustomerMax: 20,
  totalUsesMax: 1_000_000,
  discountMax: 100_000_000,
  minPaidOrdersMax: 1_000,
} as const;

export const VOUCHER_STATUSES = ["active", "paused", "archived"] as const;
export const voucherStatusSchema = z.enum(VOUCHER_STATUSES);
export type VoucherStatus = z.infer<typeof voucherStatusSchema>;

export const VOUCHER_SCOPES = ["event", "global"] as const;
export const voucherScopeSchema = z.enum(VOUCHER_SCOPES);
export type VoucherScope = z.infer<typeof voucherScopeSchema>;

export const VOUCHER_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export const voucherDiscountTypeSchema = z.enum(VOUCHER_DISCOUNT_TYPES);
export type VoucherDiscountType = z.infer<typeof voucherDiscountTypeSchema>;

export const VOUCHER_ELIGIBILITIES = [
  "everyone",
  "members",
  "loyal",
  "new_customer",
  "allowlist",
] as const;
export const voucherEligibilitySchema = z.enum(VOUCHER_ELIGIBILITIES);
export type VoucherEligibility = z.infer<typeof voucherEligibilitySchema>;

export const VOUCHER_VISIBILITIES = ["public", "private"] as const;
export const voucherVisibilitySchema = z.enum(VOUCHER_VISIBILITIES);
export type VoucherVisibility = z.infer<typeof voucherVisibilitySchema>;

/** Upper case, no spaces: what is stored, and what a typed code is normalised to. */
export const voucherCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(VOUCHER_LIMITS.codeMax)
  .regex(/^[A-Z0-9_-]+$/, "Letters, digits, dashes and underscores only");

const scopedIdsSchema = z.array(objectIdSchema).max(VOUCHER_LIMITS.scopedIdsMax).default([]);

const voucherShape = {
  code: voucherCodeSchema,
  name: z.string().trim().min(1).max(VOUCHER_LIMITS.nameMax),
  description: z.string().trim().max(VOUCHER_LIMITS.descriptionMax).default(""),
  scope: voucherScopeSchema,
  /** `scope: event` only. */
  eventId: objectIdSchema.nullable().default(null),
  /** `scope: event`: only these lines count; empty = every ticket type of the event. */
  ticketTypeIds: scopedIdsSchema,
  /** `scope: global`: events it does not apply to. */
  excludedEventIds: scopedIdsSchema,
  /** `scope: global`: only events of these program types; empty = every type. */
  eventTypeIds: scopedIdsSchema,
  discountType: voucherDiscountTypeSchema,
  /** Percent (1–100), or whole VND. */
  value: z.number().int().min(1).max(VOUCHER_LIMITS.discountMax),
  /** Ceiling of a percent discount, whole VND; null = none. */
  maxDiscount: z.number().int().min(1).max(VOUCHER_LIMITS.discountMax).nullable().default(null),
  /** People, counted on the lines the voucher applies to. */
  minSeats: z.number().int().min(1).max(ORDER_LIMITS.ticketsPerOrderMax).default(1),
  minSubtotal: z.number().int().min(0).max(VOUCHER_LIMITS.discountMax).default(0),
  eligibility: voucherEligibilitySchema.default("everyone"),
  /** `loyal`: paid orders the customer already has. */
  minPaidOrders: z.number().int().min(1).max(VOUCHER_LIMITS.minPaidOrdersMax).default(2),
  /** `allowlist`: personal data, only ever sent to holders of `voucher:write`. */
  allowlist: z.array(emailSchema).max(VOUCHER_LIMITS.allowlistMax).default([]),
  /** Null = no limit. */
  totalUses: z.number().int().min(1).max(VOUCHER_LIMITS.totalUsesMax).nullable().default(null),
  perCustomer: z.number().int().min(1).max(VOUCHER_LIMITS.perCustomerMax).default(1),
  startAt: isoDateTimeSchema.nullable().default(null),
  endAt: isoDateTimeSchema.nullable().default(null),
  visibility: voucherVisibilitySchema.default("private"),
};

type VoucherRuleInput = {
  scope: VoucherScope;
  eventId: string | null;
  discountType: VoucherDiscountType;
  value: number;
  eligibility: VoucherEligibility;
  allowlist: string[];
  startAt: string | null;
  endAt: string | null;
};

function refineVoucher(input: VoucherRuleInput, ctx: z.RefinementCtx) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });
  if (input.scope === "event" && input.eventId === null) issue("eventId", "Event required");
  if (input.discountType === "percent" && input.value > 100) issue("value", "At most 100%");
  if (input.eligibility === "allowlist" && input.allowlist.length === 0) {
    issue("allowlist", "At least one email");
  }
  if (input.startAt && input.endAt && Date.parse(input.startAt) >= Date.parse(input.endAt)) {
    issue("endAt", "End must be after start");
  }
}

export const voucherCreateRequestSchema = z.object(voucherShape).superRefine(refineVoucher);
export type VoucherCreateRequest = z.infer<typeof voucherCreateRequestSchema>;

export const voucherUpdateRequestSchema = z
  .object({ ...voucherShape, revision: z.number().int().min(1) })
  .superRefine(refineVoucher);
export type VoucherUpdateRequest = z.infer<typeof voucherUpdateRequestSchema>;

export const voucherStatusRequestSchema = z.object({
  status: voucherStatusSchema,
  revision: z.number().int().min(1),
});
export type VoucherStatusRequest = z.infer<typeof voucherStatusRequestSchema>;

/** Admin view (`voucher:write`). */
export const voucherSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  name: z.string(),
  description: z.string(),
  status: voucherStatusSchema,
  scope: voucherScopeSchema,
  eventId: objectIdSchema.nullable(),
  ticketTypeIds: z.array(objectIdSchema),
  excludedEventIds: z.array(objectIdSchema),
  eventTypeIds: z.array(objectIdSchema),
  discountType: voucherDiscountTypeSchema,
  value: z.number().int(),
  maxDiscount: z.number().int().nullable(),
  minSeats: z.number().int(),
  minSubtotal: z.number().int(),
  eligibility: voucherEligibilitySchema,
  minPaidOrders: z.number().int(),
  allowlist: z.array(z.string()),
  totalUses: z.number().int().nullable(),
  perCustomer: z.number().int(),
  startAt: isoDateTimeSchema.nullable(),
  endAt: isoDateTimeSchema.nullable(),
  visibility: voucherVisibilitySchema,
  used: z.number().int(),
  held: z.number().int(),
  revision: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type VoucherView = z.infer<typeof voucherSchema>;

export const voucherListQuerySchema = cursorPageQuerySchema.extend({
  scope: voucherScopeSchema.optional(),
  status: voucherStatusSchema.optional(),
  /** Vouchers that can apply to this event: its own, and the global ones not excluding it. */
  eventId: objectIdSchema.optional(),
  q: z.string().trim().max(60).optional(),
});
export type VoucherListQuery = z.infer<typeof voucherListQuerySchema>;

export const voucherListSchema = cursorPageSchema(voucherSchema);
export type VoucherList = z.infer<typeof voucherListSchema>;

/** Orders that used the code and were paid: what it gave away and what they brought in. */
export const voucherStatsSchema = z.object({
  paidOrders: z.number().int(),
  totalDiscount: z.number().int(),
  revenue: z.number().int(),
});
export type VoucherStats = z.infer<typeof voucherStatsSchema>;

/**
 * A voucher shown on an event page or in "Chọn ưu đãi": no allowlist, no counters but
 * the uses left. `remaining` null = no limit.
 */
export const publicVoucherSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  discountType: voucherDiscountTypeSchema,
  value: z.number().int(),
  maxDiscount: z.number().int().nullable(),
  minSeats: z.number().int(),
  minSubtotal: z.number().int(),
  remaining: z.number().int().nullable(),
  endAt: isoDateTimeSchema.nullable(),
});
export type PublicVoucher = z.infer<typeof publicVoucherSchema>;

export const publicVoucherListSchema = z.object({ items: z.array(publicVoucherSchema) });
export type PublicVoucherList = z.infer<typeof publicVoucherListSchema>;

/**
 * `web` → program-service: "Áp dụng" at checkout. A preview only: the email is not
 * proven yet, so the order checks everything again with the proof. Rate limited by
 * `clientIp` and email; every refusal is the same `voucher.invalid` on purpose.
 */
export const voucherCheckRequestSchema = z.object({
  eventSlug: z.string().min(1).max(80),
  items: z.array(orderItemInputSchema).min(1).max(ORDER_LIMITS.itemsMax),
  code: voucherCodeSchema,
  email: emailSchema.optional(),
  /** A signed-in member, read by `web` from the session. */
  userId: objectIdSchema.optional(),
  clientIp: z.string().max(64).optional(),
});
export type VoucherCheckRequest = z.infer<typeof voucherCheckRequestSchema>;

export const voucherCheckResponseSchema = z.object({
  code: z.string(),
  name: z.string(),
  subtotal: z.number().int(),
  discount: z.number().int(),
  amount: z.number().int(),
});
export type VoucherCheckResponse = z.infer<typeof voucherCheckResponseSchema>;
