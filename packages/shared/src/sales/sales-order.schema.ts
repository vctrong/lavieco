import { z } from "zod";

import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { addressInputSchema, addressSchema } from "../geo/address";

/**
 * Sales orders: the team's order book (docs/09, ADR-0030). Every order the team handles
 * lives here: the ones taken by hand on Facebook, Zalo, Threads or in person (`manual`,
 * code `LV-0001`), and a mirror of each website order (`web`, code `LVS-…`). Values are
 * English `snake_case`; the Vietnamese labels live in the admin's `text.ts`.
 */
export const SALES_ORDER_SOURCES = ["manual", "web"] as const;
export const salesOrderSourceSchema = z.enum(SALES_ORDER_SOURCES);
export type SalesOrderSource = z.infer<typeof salesOrderSourceSchema>;

export const SALES_ORDER_TYPES = ["in_stock", "made_to_order", "wholesale"] as const;
export const salesOrderTypeSchema = z.enum(SALES_ORDER_TYPES);
export type SalesOrderType = z.infer<typeof salesOrderTypeSchema>;

export const SALES_CHANNELS = [
  "facebook",
  "tiktok",
  "website",
  "zalo",
  "in_person",
  "threads",
  "other",
] as const;
export const salesChannelSchema = z.enum(SALES_CHANNELS);
export type SalesChannel = z.infer<typeof salesChannelSchema>;

export const SALES_PAYMENT_METHODS = ["bank_transfer", "cod", "cash"] as const;
export const salesPaymentMethodSchema = z.enum(SALES_PAYMENT_METHODS);
export type SalesPaymentMethod = z.infer<typeof salesPaymentMethodSchema>;

export const SALES_PAYMENT_STATUSES = ["unpaid", "deposit_paid", "paid"] as const;
export const salesPaymentStatusSchema = z.enum(SALES_PAYMENT_STATUSES);
export type SalesPaymentStatus = z.infer<typeof salesPaymentStatusSchema>;

export const SALES_ORDER_STATUSES = [
  "new",
  "in_progress",
  "shipping",
  "completed",
  "cancelled",
] as const;
export const salesOrderStatusSchema = z.enum(SALES_ORDER_STATUSES);
export type SalesOrderStatus = z.infer<typeof salesOrderStatusSchema>;

/** Quick filters of the list (chips on phones, the bot's questions later). */
export const SALES_ORDER_VIEWS = ["todo", "overdue", "shipping", "unpaid", "all"] as const;
export const salesOrderViewSchema = z.enum(SALES_ORDER_VIEWS);
export type SalesOrderView = z.infer<typeof salesOrderViewSchema>;

export const SALES_ORDER_SORTS = ["order_day", "due_day", "total", "code", "created_at"] as const;
export const salesOrderSortSchema = z.enum(SALES_ORDER_SORTS);
export type SalesOrderSort = z.infer<typeof salesOrderSortSchema>;

export const SALES_LIMITS = {
  itemsMax: 50,
  quantityMax: 9_999,
  priceMax: 100_000_000,
  nameMax: 100,
  itemNameMax: 120,
  noteMax: 1_000,
  bulkMax: 100,
  priceItemsMax: 500,
} as const;

/** `YYYY-MM-DD`, a calendar day in Asia/Ho_Chi_Minh (docs/03 §1.2). */
export const calendarDaySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "YYYY-MM-DD");

const money = z.number().int().min(0).max(SALES_LIMITS.priceMax);

/** Leading zero kept; empty when the customer gave no number (old orders). */
export const salesPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^(\+?\d[\d\s.-]{7,18})?$/, "Phone number");

// ------------------------------------------------------------------ price list

/**
 * Internal price list ("Danh mục đơn giá"): name and price only. Separate from the shop
 * catalogue on purpose: a new piece must be orderable in seconds, without photos,
 * story card or stock.
 */
export const priceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int(),
  active: z.boolean(),
  note: z.string(),
  sortOrder: z.number().int(),
  revision: z.number().int(),
  updatedAt: z.string(),
});
export type PriceItem = z.infer<typeof priceItemSchema>;

export const priceItemListSchema = z.object({ items: z.array(priceItemSchema) });
export type PriceItemList = z.infer<typeof priceItemListSchema>;

export const priceItemCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(SALES_LIMITS.itemNameMax),
  price: money,
  active: z.boolean().default(true),
  note: z.string().trim().max(200).default(""),
});
export type PriceItemCreateRequest = z.infer<typeof priceItemCreateRequestSchema>;

/** Inline edits: any subset of fields, with the revision read (optimistic lock). */
export const priceItemUpdateRequestSchema = z.object({
  revision: z.number().int().min(1),
  name: z.string().trim().min(1).max(SALES_LIMITS.itemNameMax).optional(),
  price: money.optional(),
  active: z.boolean().optional(),
  note: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
export type PriceItemUpdateRequest = z.infer<typeof priceItemUpdateRequestSchema>;

// ------------------------------------------------------------------ orders

export const salesOrderItemSchema = z.object({
  /** Price list entry it came from; `null` for a custom line or a website line. */
  priceItemId: z.string().nullable(),
  /** Name and price frozen when the line was added: later price changes never reach it. */
  name: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});
export type SalesOrderItem = z.infer<typeof salesOrderItemSchema>;

export const salesOrderItemInputSchema = z.object({
  priceItemId: z.string().min(1).max(64).nullable().default(null),
  name: z.string().trim().min(1).max(SALES_LIMITS.itemNameMax),
  unitPrice: money,
  quantity: z.number().int().min(1).max(SALES_LIMITS.quantityMax),
});
export type SalesOrderItemInput = z.infer<typeof salesOrderItemInputSchema>;

export const staffRefSchema = z.object({ id: z.string(), name: z.string() });
export type StaffRef = z.infer<typeof staffRefSchema>;

export const salesOrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  legacyCode: z.string().nullable(),
  source: salesOrderSourceSchema,
  /** The website order this one mirrors (`source: web`). */
  shopOrderId: z.string().nullable(),
  orderType: salesOrderTypeSchema,
  customer: z.object({
    name: z.string(),
    phone: z.string(),
    address: addressSchema.nullable(),
  }),
  channel: salesChannelSchema,
  items: z.array(salesOrderItemSchema),
  subtotal: z.number().int(),
  shippingFee: z.number().int(),
  discount: z.number().int(),
  total: z.number().int(),
  paymentMethod: salesPaymentMethodSchema.nullable(),
  paymentStatus: salesPaymentStatusSchema,
  status: salesOrderStatusSchema,
  orderDay: calendarDaySchema.nullable(),
  dueDay: calendarDaySchema.nullable(),
  /** Computed by the service against today in Asia/Ho_Chi_Minh. */
  dueState: z.enum(["none", "later", "today", "overdue"]),
  assignee: staffRefSchema.nullable(),
  note: z.string(),
  createdBy: staffRefSchema.nullable(),
  updatedBy: staffRefSchema.nullable(),
  deletedAt: z.string().nullable(),
  revision: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SalesOrder = z.infer<typeof salesOrderSchema>;

/**
 * Create or full edit of a manual order. Totals are never accepted: the service computes
 * `subtotal = Σ unitPrice × quantity` and `total = subtotal + shippingFee − discount`.
 */
export const salesOrderInputSchema = z.object({
  orderType: salesOrderTypeSchema,
  customer: z.object({
    name: z.string().trim().min(1).max(SALES_LIMITS.nameMax),
    phone: salesPhoneSchema.default(""),
    address: addressInputSchema.nullable().default(null),
  }),
  channel: salesChannelSchema,
  items: z.array(salesOrderItemInputSchema).min(1).max(SALES_LIMITS.itemsMax),
  shippingFee: money.default(0),
  discount: money.default(0),
  paymentMethod: salesPaymentMethodSchema.nullable().default(null),
  paymentStatus: salesPaymentStatusSchema.default("unpaid"),
  status: salesOrderStatusSchema.default("new"),
  orderDay: calendarDaySchema.nullable(),
  dueDay: calendarDaySchema.nullable().default(null),
  assigneeId: z.string().min(1).max(64).nullable().default(null),
  note: z.string().trim().max(SALES_LIMITS.noteMax).default(""),
});
export type SalesOrderInput = z.infer<typeof salesOrderInputSchema>;

export const salesOrderUpdateRequestSchema = salesOrderInputSchema.extend({
  revision: z.number().int().min(1),
});
export type SalesOrderUpdateRequest = z.infer<typeof salesOrderUpdateRequestSchema>;

/**
 * What can change on a website order (its status, money and payment follow the shop
 * order): who handles it, when it is due, the team's note.
 */
export const salesOrderTeamFieldsRequestSchema = z.object({
  revision: z.number().int().min(1),
  assigneeId: z.string().min(1).max(64).nullable(),
  dueDay: calendarDaySchema.nullable(),
  note: z.string().trim().max(SALES_LIMITS.noteMax),
});
export type SalesOrderTeamFieldsRequest = z.infer<typeof salesOrderTeamFieldsRequestSchema>;

/** One tap from the list or the detail: status and/or payment status. */
export const salesOrderQuickUpdateRequestSchema = z
  .object({
    revision: z.number().int().min(1),
    status: salesOrderStatusSchema.optional(),
    paymentStatus: salesPaymentStatusSchema.optional(),
  })
  .refine((value) => value.status !== undefined || value.paymentStatus !== undefined, {
    message: "Nothing to change",
  });
export type SalesOrderQuickUpdateRequest = z.infer<typeof salesOrderQuickUpdateRequestSchema>;

export const salesOrderBulkStatusRequestSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(SALES_LIMITS.bulkMax),
  status: salesOrderStatusSchema,
});
export type SalesOrderBulkStatusRequest = z.infer<typeof salesOrderBulkStatusRequestSchema>;

export const salesOrderBulkResultSchema = z.object({
  updated: z.number().int(),
  /** Website orders and deleted ones are skipped, never failed. */
  skipped: z.number().int(),
});
export type SalesOrderBulkResult = z.infer<typeof salesOrderBulkResultSchema>;

export const salesOrderRevisionRequestSchema = z.object({ revision: z.number().int().min(1) });
export type SalesOrderRevisionRequest = z.infer<typeof salesOrderRevisionRequestSchema>;

const csvList = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" ? value.split(",").filter((part) => part.length > 0) : value,
    z.array(item).max(10),
  );

export const salesOrderListQuerySchema = cursorPageQuerySchema.extend({
  view: salesOrderViewSchema.default("all"),
  status: csvList(salesOrderStatusSchema).optional(),
  paymentStatus: csvList(salesPaymentStatusSchema).optional(),
  orderType: csvList(salesOrderTypeSchema).optional(),
  channel: csvList(salesChannelSchema).optional(),
  source: salesOrderSourceSchema.optional(),
  /** `none` = nobody assigned yet. */
  assigneeId: z.string().min(1).max(64).optional(),
  from: calendarDaySchema.optional(),
  to: calendarDaySchema.optional(),
  /** Name, phone or code (`LV-0012`, `LVS-…`, old `G-03`). */
  q: z.string().trim().max(100).optional(),
  deleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
  sort: salesOrderSortSchema.default("order_day"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type SalesOrderListQuery = z.infer<typeof salesOrderListQuerySchema>;

export const salesOrderListSchema = cursorPageSchema(salesOrderSchema).extend({
  /** Matching orders, all pages. */
  total: z.number().int(),
});
export type SalesOrderList = z.infer<typeof salesOrderListSchema>;

// ------------------------------------------------------------------ lookups and summary

export const salesCustomerLookupQuerySchema = z.object({ phone: salesPhoneSchema });

/** Last known name and address of a phone number, to prefill the form. */
export const salesCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: addressSchema.nullable(),
  orders: z.number().int(),
  lastOrderDay: calendarDaySchema.nullable(),
});
export const salesCustomerLookupSchema = z.object({ customer: salesCustomerSchema.nullable() });
export type SalesCustomer = z.infer<typeof salesCustomerSchema>;

export const salesAssigneeListSchema = z.object({ items: z.array(staffRefSchema) });
export type SalesAssigneeList = z.infer<typeof salesAssigneeListSchema>;

/**
 * Window of the summary: the current month and the N-1 before it, or everything. Orders
 * without an order day (a few old ones) only count in `all`.
 */
export const SALES_SUMMARY_PERIODS = ["1", "2", "3", "6", "12", "all"] as const;
export const salesSummaryPeriodSchema = z.enum(SALES_SUMMARY_PERIODS);
export type SalesSummaryPeriod = z.infer<typeof salesSummaryPeriodSchema>;

export const salesSummaryQuerySchema = z.object({
  period: salesSummaryPeriodSchema.default("6"),
});
export type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;

export const salesSummarySchema = z.object({
  period: z.object({
    key: salesSummaryPeriodSchema,
    /** First day counted; null for `all`. */
    from: calendarDaySchema.nullable(),
  }),
  /** Orders of the period: count, cancelled, revenue of the others and its average. */
  totals: z.object({
    orders: z.number().int(),
    cancelled: z.number().int(),
    revenue: z.number().int(),
    averageOrder: z.number().int(),
  }),
  /** Orders of the period by status. */
  byStatus: z.record(salesOrderStatusSchema, z.number().int()),
  /** Quick views of the list: today's state, never limited to the period. */
  views: z.record(salesOrderViewSchema, z.number().int()),
  /** Orders of the period not cancelled whose money is not fully in. */
  outstanding: z.object({ orders: z.number().int(), amount: z.number().int() }),
  /** Revenue of non-cancelled orders by order month (`YYYY-MM`), oldest first, no gap. */
  revenueByMonth: z.array(
    z.object({ month: z.string(), orders: z.number().int(), revenue: z.number().int() }),
  ),
  generatedAt: z.string(),
});
export type SalesSummary = z.infer<typeof salesSummarySchema>;
