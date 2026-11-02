import { DomainError, normalizeEmail } from "@lavieco/shared";
import type {
  VoucherCreateRequest,
  VoucherDiscountType,
  VoucherEligibility,
  VoucherScope,
  VoucherStatus,
  VoucherVisibility,
} from "@lavieco/shared/events";

/** `vouchers` (docs/03 §9.2). `used`/`held` only move with orders, like seats. */
export type VoucherRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: VoucherStatus;
  scope: VoucherScope;
  eventId: string | null;
  ticketTypeIds: string[];
  excludedEventIds: string[];
  eventTypeIds: string[];
  discountType: VoucherDiscountType;
  value: number;
  maxDiscount: number | null;
  minSeats: number;
  minSubtotal: number;
  eligibility: VoucherEligibility;
  minPaidOrders: number;
  allowlist: string[];
  totalUses: number | null;
  perCustomer: number;
  startAt: Date | null;
  endAt: Date | null;
  visibility: VoucherVisibility;
  used: number;
  held: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type VoucherChanges = Omit<
  VoucherRecord,
  "id" | "status" | "used" | "held" | "revision" | "createdAt" | "updatedAt"
>;

export function toVoucherChanges(input: VoucherCreateRequest): VoucherChanges {
  const event = input.scope === "event";
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    scope: input.scope,
    eventId: event ? input.eventId : null,
    ticketTypeIds: event ? input.ticketTypeIds : [],
    excludedEventIds: event ? [] : input.excludedEventIds,
    eventTypeIds: event ? [] : input.eventTypeIds,
    discountType: input.discountType,
    value: input.value,
    maxDiscount: input.discountType === "percent" ? input.maxDiscount : null,
    minSeats: input.minSeats,
    minSubtotal: input.minSubtotal,
    eligibility: input.eligibility,
    minPaidOrders: input.minPaidOrders,
    allowlist:
      input.eligibility === "allowlist"
        ? [...new Set(input.allowlist.map((email) => normalizeEmail(email)))]
        : [],
    totalUses: input.totalUses,
    perCustomer: input.perCustomer,
    startAt: input.startAt ? new Date(input.startAt) : null,
    endAt: input.endAt ? new Date(input.endAt) : null,
    visibility: input.visibility,
  };
}

/** Once a code was used people may hold it: it stays, and limits cannot drop below use. */
export function assertVoucherChangeAllowed(current: VoucherRecord, next: VoucherChanges): void {
  const taken = current.used + current.held;
  if (taken > 0 && next.code !== current.code) throw new DomainError("voucher.locked");
  if (next.totalUses !== null && next.totalUses < taken) throw new DomainError("voucher.locked");
}

export type VoucherLine = {
  ticketTypeId: string;
  unitPrice: number;
  quantity: number;
  seatsPerUnit: number;
};

export type VoucherContext = {
  eventId: string;
  eventTypeId: string;
  lines: readonly VoucherLine[];
  /** Null before the email is proven (the preview at checkout). */
  email: string | null;
  userId: string | null;
  /** Paid orders this customer already has, 0 when unknown. */
  paidOrders: number;
  now: Date;
};

/** What an order cannot get through, all answered by one generic error (no code probing). */
const refuse = (): never => {
  throw new DomainError("voucher.invalid");
};

export const isLive = (voucher: VoucherRecord, now: Date) =>
  voucher.status === "active" &&
  (voucher.startAt === null || voucher.startAt <= now) &&
  (voucher.endAt === null || voucher.endAt > now);

export function appliesToEvent(voucher: VoucherRecord, eventId: string, eventTypeId: string) {
  if (voucher.scope === "event") return voucher.eventId === eventId;
  if (voucher.excludedEventIds.includes(eventId)) return false;
  return voucher.eventTypeIds.length === 0 || voucher.eventTypeIds.includes(eventTypeId);
}

function isEligible(voucher: VoucherRecord, context: VoucherContext): boolean {
  switch (voucher.eligibility) {
    case "everyone":
      return true;
    case "members":
      return context.userId !== null;
    case "loyal":
      return context.paidOrders >= voucher.minPaidOrders;
    case "new_customer":
      // Not knowable without an email: the order checks again with the proof.
      return context.email !== null && context.paidOrders === 0;
    case "allowlist":
      return context.email !== null && voucher.allowlist.includes(normalizeEmail(context.email));
  }
}

/** Largest amount off: percent rounded down, capped; never more than the lines it covers. */
export function discountOf(
  voucher: Pick<VoucherRecord, "discountType" | "value" | "maxDiscount">,
  base: number,
): number {
  const raw =
    voucher.discountType === "percent" ? Math.floor((base * voucher.value) / 100) : voucher.value;
  const capped = voucher.maxDiscount === null ? raw : Math.min(raw, voucher.maxDiscount);
  return Math.min(capped, base);
}

/**
 * The discount this voucher gives this order, or `voucher.invalid`. Live, right event,
 * eligible customer, conditions met on the lines it covers. BR-18: one code per order;
 * computed on the subtotal, combos included, on the server only.
 */
export function quoteVoucher(voucher: VoucherRecord, context: VoucherContext): number {
  if (!isLive(voucher, context.now)) refuse();
  if (!appliesToEvent(voucher, context.eventId, context.eventTypeId)) refuse();
  if (!isEligible(voucher, context)) refuse();
  const covered =
    voucher.ticketTypeIds.length === 0
      ? context.lines
      : context.lines.filter((line) => voucher.ticketTypeIds.includes(line.ticketTypeId));
  const base = covered.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const seats = covered.reduce((sum, line) => sum + line.quantity * line.seatsPerUnit, 0);
  if (seats < voucher.minSeats || base < voucher.minSubtotal) refuse();
  const discount = discountOf(voucher, base);
  if (discount <= 0) refuse();
  return discount;
}

/** `userId`, else the email (plan: PR4). Both are checked for the per-customer limit. */
export const customerKeyOf = (customer: { userId: string | null; email: string }) =>
  customer.userId ?? normalizeEmail(customer.email);
