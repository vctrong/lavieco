import { DomainError } from "@lavieco/shared";
import {
  ORDER_LIMITS,
  type FormQuestion,
  type OrderAnswerValue,
  type OrderFlags,
  type OrderStatus,
} from "@lavieco/shared/events";

import { isOnSale, type TicketTypeRecord } from "../../ticketing";

/**
 * Where the order's seats are: `held` while pending, `sold` once paid (or free),
 * `released` after expiry, cancellation, refund, or a late payment that found none.
 */
export type SeatState = "held" | "sold" | "released";

/** Snapshot of a ticket type at booking time: later price edits never change it. */
export type OrderItem = {
  ticketTypeId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

/**
 * The booker only (BR-13). Personal data, kept apart from the financial fields so the
 * retention job can anonymise it alone. TODO(dq8-anonymize): 24 months after the event
 * ends, overwrite `buyer`, `note` and the order's `order_answers`, set `anonymizedAt`.
 */
export type OrderBuyer = {
  fullName: string;
  email: string;
  emailNormalized: string;
  phone: string;
  phoneNormalized: string;
  /** Confirmed "Tôi là phụ huynh/người giám hộ" (events for children, BR-08). */
  isGuardian: boolean;
};

/** payOS payment link, only what the payment page and reconciliation need. */
export type PaymentLink = {
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  bin: string;
  accountNumber: string;
  accountName: string;
  description: string;
  /** Never later than the hold (`expiresAt` of the order). */
  expiresAt: Date;
};

export type OrderRecord = {
  id: string;
  orderCode: number;
  eventId: string;
  /** Set when a signed-in member booked (from their email proof). */
  userId: string | null;
  /** `sub` of the email proof: one proof, one order. */
  verificationId: string;
  buyer: OrderBuyer;
  items: OrderItem[];
  amount: number;
  status: OrderStatus;
  seatState: SeatState;
  expiresAt: Date;
  paidAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  refundedAt: Date | null;
  refundNote: string;
  note: string;
  consent: { version: string; at: Date };
  safetyAcknowledgedAt: Date | null;
  flags: OrderFlags;
  payment: PaymentLink | null;
  lastReconciledAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderAnswer = { questionId: string; value: string | string[] };

export const HOLD_MS = ORDER_LIMITS.holdMinutes * 60 * 1000;

export const NO_FLAGS: OrderFlags = {
  refundRequired: false,
  amountMismatch: false,
  latePayment: false,
};

/**
 * Prices the selection from the ticket types as stored, never from the client
 * (docs/05 §7). Hidden, unknown or off-sale types, a quantity above the type's
 * `maxPerOrder` and more than 20 tickets in total are refused.
 */
export function priceOrder(
  ticketTypes: readonly TicketTypeRecord[],
  selection: readonly { ticketTypeId: string; quantity: number }[],
  now: Date,
): { items: OrderItem[]; amount: number; ticketCount: number } {
  const byId = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType]));
  const items = selection.map((line) => {
    const ticketType = byId.get(line.ticketTypeId);
    if (!ticketType || ticketType.hidden || !isOnSale(ticketType, now)) {
      throw new DomainError("order.items_invalid", "ticket type not on sale");
    }
    if (line.quantity < 1 || line.quantity > ticketType.maxPerOrder) {
      throw new DomainError("order.items_invalid", "quantity above the per-order limit");
    }
    return {
      ticketTypeId: ticketType.id,
      name: ticketType.name,
      unitPrice: ticketType.price,
      quantity: line.quantity,
    };
  });
  const ticketCount = items.reduce((sum, item) => sum + item.quantity, 0);
  if (items.length === 0 || ticketCount > ORDER_LIMITS.ticketsPerOrderMax) {
    throw new DomainError("order.items_invalid", "too many tickets in one order");
  }
  const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { items, amount, ticketCount };
}

/**
 * Checks answers against the visible questions: required ones answered, choices among
 * the question's options (one for single choice/dropdown), no unknown question.
 * Returns them in question order; empty optional answers are dropped.
 */
export function validateAnswers(
  questions: readonly FormQuestion[],
  answers: Readonly<Record<string, OrderAnswerValue>>,
): OrderAnswer[] {
  const known = new Set(questions.map((question) => question.id));
  if (Object.keys(answers).some((questionId) => !known.has(questionId))) {
    throw new DomainError("order.answers_invalid", "unknown question");
  }
  const result: OrderAnswer[] = [];
  for (const question of questions) {
    const raw = answers[question.id];
    const isChoice = question.type !== "short_text" && question.type !== "paragraph";
    if (isChoice) {
      const picked = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
      const options = new Set(question.options.map((option) => option.id));
      const unique = [...new Set(picked.filter((id) => id !== ""))];
      if (unique.some((id) => !options.has(id))) {
        throw new DomainError("order.answers_invalid", "unknown option");
      }
      if (question.type !== "multiple_choice" && unique.length > 1) {
        throw new DomainError("order.answers_invalid", "one option only");
      }
      if (unique.length === 0) {
        if (question.required) throw new DomainError("order.answers_invalid", "required");
        continue;
      }
      result.push({
        questionId: question.id,
        value: question.type === "multiple_choice" ? unique : unique[0]!,
      });
    } else {
      if (Array.isArray(raw)) throw new DomainError("order.answers_invalid", "text expected");
      const text = (raw ?? "").trim();
      if (text === "") {
        if (question.required) throw new DomainError("order.answers_invalid", "required");
        continue;
      }
      result.push({ questionId: question.id, value: text });
    }
  }
  return result;
}

/** Text of an answer for exports and the admin detail (choices joined, labels resolved). */
export function answerText(question: FormQuestion | undefined, value: string | string[]): string {
  const ids = Array.isArray(value) ? value : [value];
  if (!question || question.options.length === 0) return ids.join(", ");
  const labels = new Map(question.options.map((option) => [option.id, option.label]));
  return ids.map((id) => labels.get(id) ?? id).join(", ");
}

export type SettlementPlan =
  /** Already paid or refunded: a webhook sent twice, or a reconcile after the webhook. */
  | { kind: "duplicate" }
  /** payOS reports another amount: record it, flag the order, issue nothing. */
  | { kind: "amount_mismatch" }
  /** Pending with its hold still in place: held → sold. */
  | { kind: "convert_hold" }
  /**
   * The hold ended (expired, or cancelled by the buyer) and the money still came:
   * take seats again if any are left, otherwise paid + refundRequired.
   */
  | { kind: "retake_seats" };

/**
 * One rule for the webhook AND "Kiểm tra lại thanh toán" (they share the same
 * idempotent settlement). BR-15: only a verified payment ever reaches this point.
 */
export function planSettlement(
  order: Pick<OrderRecord, "status" | "seatState" | "amount">,
  paidAmount: number,
): SettlementPlan {
  if (order.status === "paid" || order.status === "refunded") return { kind: "duplicate" };
  if (paidAmount !== order.amount) return { kind: "amount_mismatch" };
  if (order.status === "pending" && order.seatState === "held") return { kind: "convert_hold" };
  return { kind: "retake_seats" };
}

/** "Đánh dấu đã hoàn tiền" applies to paid orders only (BR-15: refunds are manual). */
export function assertRefundable(order: Pick<OrderRecord, "status">): void {
  if (order.status !== "paid") throw new DomainError("order.invalid_state");
}
