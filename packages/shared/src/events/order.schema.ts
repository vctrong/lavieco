import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageSchema } from "../common/pagination";
import { consentVersionSchema } from "../identity/member-auth.schema";
import { emailSchema } from "../identity/password";
import { normalizePhone } from "../utils/normalize-phone";
import { eventFormatSchema } from "./enums";
import { eventVenueSchema } from "./event.schema";

/**
 * Seat hold and order caps (docs/05, BR-14). The hold starts only after the email
 * passed OTP and lasts 15 minutes; the payOS link never outlives it.
 */
export const ORDER_LIMITS = {
  holdMinutes: 15,
  /** Whole order, whatever the ticket types (each type also has its own maxPerOrder). */
  ticketsPerOrderMax: 20,
  itemsMax: 10,
  noteMax: 1_000,
  answerTextMax: 2_000,
  fullNameMax: 120,
  refundNoteMax: 500,
} as const;

/**
 * `pending` holds seats until `expiresAt`; `paid` owns sold seats (or none, when a
 * late payment found no seat left: `flags.refundRequired`). `refunded` is set by hand
 * after a manual bank transfer (BR-15), never through a payOS API.
 */
export const ORDER_STATUSES = ["pending", "paid", "expired", "cancelled", "refunded"] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const TICKET_STATUSES = ["valid", "used", "void"] as const;
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

/** Why an event cannot take registrations right now (shown as "Sắp mở đăng ký" etc.). */
export const REGISTRATION_BLOCKERS = [
  "not_open",
  "online_link_pending",
  "sold_out",
  "sale_not_started",
  "sale_ended",
  "event_started",
] as const;
export const registrationBlockerSchema = z.enum(REGISTRATION_BLOCKERS);
export type RegistrationBlocker = z.infer<typeof registrationBlockerSchema>;

const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => normalizePhone(value) !== null, { message: "Invalid phone number" });

/** The booker only: no attendee names, health data or ID numbers (BR-13, BR-08). */
export const orderBuyerInputSchema = z.object({
  fullName: z.string().trim().min(1).max(ORDER_LIMITS.fullNameMax),
  email: emailSchema,
  phone: phoneSchema,
});
export type OrderBuyerInput = z.infer<typeof orderBuyerInputSchema>;

/** Text answer, or option ids for choice questions. Keyed by the immutable question id. */
export const orderAnswerValueSchema = z.union([
  z.string().trim().max(ORDER_LIMITS.answerTextMax),
  z.array(z.uuid()).max(20),
]);
export type OrderAnswerValue = z.infer<typeof orderAnswerValueSchema>;

export const orderItemInputSchema = z.object({
  ticketTypeId: objectIdSchema,
  quantity: z.number().int().min(1).max(ORDER_LIMITS.ticketsPerOrderMax),
});

/**
 * `web` → program-service once the email is verified. Prices are never sent: the
 * service recomputes them (docs/05 §7). `verificationToken` is the single-use proof
 * from identity-service (OTP, or a member's verified email), purpose `checkout`.
 */
export const orderCreateRequestSchema = z.object({
  eventSlug: z.string().min(1).max(80),
  items: z
    .array(orderItemInputSchema)
    .min(1)
    .max(ORDER_LIMITS.itemsMax)
    .refine((items) => new Set(items.map((item) => item.ticketTypeId)).size === items.length, {
      message: "A ticket type appears twice",
    }),
  buyer: orderBuyerInputSchema,
  answers: z.record(z.uuid(), orderAnswerValueSchema).default({}),
  note: z.string().trim().max(ORDER_LIMITS.noteMax).default(""),
  /** BR-06: always required; its version and time are stored on the order. */
  dataConsent: z.literal(true),
  consentVersion: consentVersionSchema,
  /** Required only when the event has safety notes. */
  safetyAcknowledged: z.boolean().default(false),
  verificationToken: z.string().min(10).max(4096),
});
export type OrderCreateRequest = z.infer<typeof orderCreateRequestSchema>;

/** Signed link to one order (`/ve/[token]`, payment page, cancel). Opaque to callers. */
export const orderAccessTokenSchema = z
  .string()
  .min(20)
  .max(200)
  .regex(/^[A-Za-z0-9_.-]+$/);

/** QR shown on the LAVIECO page, plus payOS checkout as a fallback. */
export const orderPaymentSchema = z.object({
  qrCode: z.string(),
  checkoutUrl: z.url(),
  bin: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  description: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type OrderPayment = z.infer<typeof orderPaymentSchema>;

export const orderItemViewSchema = z.object({
  ticketTypeId: objectIdSchema,
  name: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
});
export type OrderItemView = z.infer<typeof orderItemViewSchema>;

/** A ticket as its holder sees it: the QR is rendered from `qrToken` on demand, never stored. */
export const ticketViewSchema = z.object({
  code: z.string(),
  ticketTypeName: z.string(),
  status: ticketStatusSchema,
  qrToken: z.string(),
  checkedInAt: isoDateTimeSchema.nullable(),
});
export type TicketView = z.infer<typeof ticketViewSchema>;

/**
 * What the holder of an order link sees (payment page, `/ve/[token]`). Tickets only
 * once paid; `onlineUrl` only on tickets of an online event, never on public pages.
 */
export const orderViewSchema = z.object({
  orderCode: z.number().int(),
  status: orderStatusSchema,
  amount: z.number().int(),
  expiresAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable(),
  buyer: z.object({ fullName: z.string(), email: z.string() }),
  event: z.object({
    slug: z.string(),
    title: z.string(),
    format: eventFormatSchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    venue: eventVenueSchema.nullable(),
    onlineUrl: z.string().nullable(),
  }),
  items: z.array(orderItemViewSchema),
  payment: orderPaymentSchema.nullable(),
  tickets: z.array(ticketViewSchema),
  /** Paid after the hold ended and no seat was left: the team refunds by hand. */
  refundRequired: z.boolean(),
});
export type OrderView = z.infer<typeof orderViewSchema>;

export const orderCreateResponseSchema = z.object({
  accessToken: orderAccessTokenSchema,
  order: orderViewSchema,
});
export type OrderCreateResponse = z.infer<typeof orderCreateResponseSchema>;

/** `/tra-cuu-ve`: every order of a verified email (purpose `ticket_lookup`). */
export const ticketLookupRequestSchema = z.object({
  verificationToken: z.string().min(10).max(4096),
});
export type TicketLookupRequest = z.infer<typeof ticketLookupRequestSchema>;

export const ticketLookupResponseSchema = z.object({
  items: z.array(
    z.object({
      accessToken: orderAccessTokenSchema,
      orderCode: z.number().int(),
      status: orderStatusSchema,
      ticketCount: z.number().int(),
      event: z.object({ title: z.string(), startAt: isoDateTimeSchema }),
    }),
  ),
});
export type TicketLookupResponse = z.infer<typeof ticketLookupResponseSchema>;

// --- admin ---

export const orderFlagsSchema = z.object({
  /** Paid after expiry/cancellation and no seat was left: refund by hand. */
  refundRequired: z.boolean(),
  /** payOS reported an amount different from the order: nothing was issued. */
  amountMismatch: z.boolean(),
  /** Paid after the hold ended, seats were still available and were taken again. */
  latePayment: z.boolean(),
});
export type OrderFlags = z.infer<typeof orderFlagsSchema>;

export const ORDER_FLAG_FILTERS = ["refund_required", "amount_mismatch"] as const;

export const orderListQuerySchema = z.object({
  eventId: objectIdSchema.optional(),
  status: orderStatusSchema.optional(),
  flag: z.enum(ORDER_FLAG_FILTERS).optional(),
  /** Order code, or part of the buyer's name/email/phone. */
  q: z.string().trim().max(120).optional(),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

const adminBuyerSchema = z.object({ fullName: z.string(), email: z.string(), phone: z.string() });

export const orderListItemSchema = z.object({
  id: objectIdSchema,
  orderCode: z.number().int(),
  event: z.object({ id: objectIdSchema, title: z.string() }),
  buyer: adminBuyerSchema,
  amount: z.number().int(),
  status: orderStatusSchema,
  ticketCount: z.number().int(),
  flags: orderFlagsSchema,
  createdAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable(),
});
export type OrderListItem = z.infer<typeof orderListItemSchema>;

export const orderListSchema = cursorPageSchema(orderListItemSchema);
export type OrderList = z.infer<typeof orderListSchema>;

export const PAYMENT_EVENT_SOURCES = ["webhook", "reconcile"] as const;
export const PAYMENT_OUTCOMES = [
  "paid",
  "duplicate",
  "amount_mismatch",
  "refund_required",
  "unknown_order",
] as const;
export const paymentOutcomeSchema = z.enum(PAYMENT_OUTCOMES);
export type PaymentOutcome = z.infer<typeof paymentOutcomeSchema>;

/** Reconciliation fields only: never the payer's name or account (docs/05). */
export const paymentEventViewSchema = z.object({
  source: z.enum(PAYMENT_EVENT_SOURCES),
  amount: z.number().int(),
  reference: z.string().nullable(),
  transactionAt: z.string().nullable(),
  outcome: paymentOutcomeSchema,
  createdAt: isoDateTimeSchema,
});
export type PaymentEventView = z.infer<typeof paymentEventViewSchema>;

export const orderDetailSchema = orderListItemSchema.extend({
  items: z.array(orderItemViewSchema),
  expiresAt: isoDateTimeSchema,
  cancelledAt: isoDateTimeSchema.nullable(),
  refundedAt: isoDateTimeSchema.nullable(),
  refundNote: z.string(),
  note: z.string(),
  consentVersion: z.string(),
  tickets: z.array(
    z.object({
      code: z.string(),
      ticketTypeName: z.string(),
      status: ticketStatusSchema,
      checkedInAt: isoDateTimeSchema.nullable(),
    }),
  ),
  answers: z.array(
    z.object({ questionId: z.uuid(), label: z.string(), hidden: z.boolean(), value: z.string() }),
  ),
  payments: z.array(paymentEventViewSchema),
  payos: z.object({ paymentLinkId: z.string().nullable() }),
  revision: z.number().int(),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

/** "Đánh dấu đã hoàn tiền": status only, tickets void, seats back (BR-15). Step-up. */
export const orderRefundRequestSchema = z.object({
  revision: z.number().int().min(1),
  note: z.string().trim().min(1).max(ORDER_LIMITS.refundNoteMax),
});
export type OrderRefundRequest = z.infer<typeof orderRefundRequestSchema>;
