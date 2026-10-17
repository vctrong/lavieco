import type { TxContext } from "@lavieco/service-kit/ports";
import type { OrderListQuery, OrderStatus, PaymentOutcome } from "@lavieco/shared/events";

import type { OrderAnswer, OrderRecord, PaymentLink, SeatState } from "../../domain/order";
import type { NewTicket, TicketRecord } from "../../domain/ticket";

export const ORDER_REPOSITORY = Symbol("ORDER_REPOSITORY");
export const ORDER_ANSWER_REPOSITORY = Symbol("ORDER_ANSWER_REPOSITORY");
export const TICKET_REPOSITORY = Symbol("TICKET_REPOSITORY");
export const PAYMENT_EVENT_REPOSITORY = Symbol("PAYMENT_EVENT_REPOSITORY");

export type NewOrder = Omit<
  OrderRecord,
  | "id"
  | "cancelledAt"
  | "expiredAt"
  | "refundedAt"
  | "refundNote"
  | "payment"
  | "lastReconciledAt"
  | "revision"
  | "createdAt"
  | "updatedAt"
> & { id: string };

/** Fields a status change may set. */
export type OrderChanges = Partial<
  Pick<
    OrderRecord,
    | "status"
    | "seatState"
    | "paidAt"
    | "cancelledAt"
    | "expiredAt"
    | "refundedAt"
    | "refundNote"
    | "lastReconciledAt"
  >
> & { flags?: Partial<OrderRecord["flags"]> };

/**
 * Condition of a guarded update. Every state change is a conditional update on the
 * current status (and more), so concurrent webhooks, reconciles, expiry runs on
 * several instances and admin clicks can never apply the same change twice.
 */
export type OrderGuard = {
  statuses: readonly OrderStatus[];
  seatState?: SeatState;
  expiresBefore?: Date;
  revision?: number;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Thrown by `insert` when the email proof already produced an order (one proof, one order). */
export class VerificationUsedError extends Error {
  override name = "VerificationUsedError";
}

export interface OrderRepository {
  newId(): string;
  insert(order: NewOrder, tx: TxContext): Promise<OrderRecord>;
  findById(id: string, tx?: TxContext): Promise<OrderRecord | null>;
  findByOrderCode(orderCode: number, tx?: TxContext): Promise<OrderRecord | null>;
  findByVerificationId(verificationId: string): Promise<OrderRecord | null>;
  /** Applies `changes` only if the order still matches `guard`; bumps `revision`. */
  transition(
    id: string,
    guard: OrderGuard,
    changes: OrderChanges,
    tx?: TxContext,
  ): Promise<OrderRecord | null>;
  setPayment(id: string, payment: PaymentLink): Promise<OrderRecord | null>;
  /** Pending orders whose hold ended, oldest first. */
  listExpired(now: Date, limit: number): Promise<string[]>;
  /** Paid or refunded orders of one booker, newest first (`/tra-cuu-ve`). */
  listByEmail(emailNormalized: string, limit: number): Promise<OrderRecord[]>;
  listAdmin(query: OrderListQuery): Promise<Page<OrderRecord>>;
  /** Paid/refunded orders of one event for the registration list and export. */
  listForRegistrations(
    eventId: string,
    options: { includeRefunded: boolean; q?: string; cursor?: string; limit: number },
  ): Promise<Page<OrderRecord>>;
}

export interface OrderAnswerRepository {
  insert(orderId: string, eventId: string, answers: OrderAnswer[], tx: TxContext): Promise<void>;
  findByOrders(orderIds: string[]): Promise<Map<string, OrderAnswer[]>>;
}

export interface TicketRepository {
  insertMany(tickets: NewTicket[], tx: TxContext): Promise<TicketRecord[]>;
  /** Which of these codes already exist (random codes are checked before insert). */
  existingCodes(codes: string[], tx: TxContext): Promise<Set<string>>;
  listByOrder(orderId: string, tx?: TxContext): Promise<TicketRecord[]>;
  listByOrders(orderIds: string[]): Promise<Map<string, TicketRecord[]>>;
  /** Voids every valid or used ticket of an order (refund). Returns how many changed. */
  voidByOrder(orderId: string, at: Date, tx: TxContext): Promise<number>;
  findByQrToken(qrToken: string): Promise<TicketRecord | null>;
  findByCode(code: string): Promise<TicketRecord | null>;
  /** BR-16: `valid → used` for this event only, atomically; null when it was not valid. */
  checkIn(id: string, eventId: string, by: string, at: Date): Promise<TicketRecord | null>;
  countByEvent(eventId: string): Promise<{ checkedIn: number; total: number }>;
}

/** Reconciliation fields of a verified payment (never the payer's name or account). */
export type PaymentEventInput = {
  orderCode: number;
  source: "webhook" | "reconcile";
  amount: number;
  reference: string | null;
  paymentLinkId: string | null;
  transactionAt: string | null;
  outcome: PaymentOutcome;
};

export type PaymentEventRecord = PaymentEventInput & { createdAt: Date };

export interface PaymentEventRepository {
  insert(event: PaymentEventInput, tx?: TxContext): Promise<void>;
  listByOrderCode(orderCode: number): Promise<PaymentEventRecord[]>;
}
