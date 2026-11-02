import type { VoucherView } from "@lavieco/shared/events";

export type VoucherFormValues = {
  code: string;
  name: string;
  description: string;
  scope: VoucherView["scope"];
  eventId: string;
  ticketTypeIds: string;
  excludedEventIds: string;
  eventTypeIds: string[];
  discountType: VoucherView["discountType"];
  value: string;
  maxDiscount: string;
  minSeats: string;
  minSubtotal: string;
  eligibility: VoucherView["eligibility"];
  minPaidOrders: string;
  allowlist: string;
  totalUses: string;
  perCustomer: string;
  startLocal: string;
  endLocal: string;
  visibility: VoucherView["visibility"];
};

const list = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN);
const optional = (text: string) => (text.trim() === "" ? null : whole(text));

/** Vietnam has one offset all year; `datetime-local` holds wall-clock time there. */
const VN_OFFSET_MS = 7 * 3_600_000;
export const isoToLocal = (iso: string | null) =>
  iso ? new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 16) : "";
export const localToIso = (local: string) =>
  local ? new Date(Date.parse(`${local}:00Z`) - VN_OFFSET_MS).toISOString() : null;

export function emptyValues(eventId: string | null): VoucherFormValues {
  return {
    code: "",
    name: "",
    description: "",
    scope: eventId ? "event" : "global",
    eventId: eventId ?? "",
    ticketTypeIds: "",
    excludedEventIds: "",
    eventTypeIds: [],
    discountType: "percent",
    value: "10",
    maxDiscount: "",
    minSeats: "1",
    minSubtotal: "0",
    eligibility: "everyone",
    minPaidOrders: "2",
    allowlist: "",
    totalUses: "",
    perCustomer: "1",
    startLocal: "",
    endLocal: "",
    visibility: "private",
  };
}

export function valuesOf(voucher: VoucherView): VoucherFormValues {
  return {
    code: voucher.code,
    name: voucher.name,
    description: voucher.description,
    scope: voucher.scope,
    eventId: voucher.eventId ?? "",
    ticketTypeIds: voucher.ticketTypeIds.join(", "),
    excludedEventIds: voucher.excludedEventIds.join(", "),
    eventTypeIds: voucher.eventTypeIds,
    discountType: voucher.discountType,
    value: String(voucher.value),
    maxDiscount: voucher.maxDiscount === null ? "" : String(voucher.maxDiscount),
    minSeats: String(voucher.minSeats),
    minSubtotal: String(voucher.minSubtotal),
    eligibility: voucher.eligibility,
    minPaidOrders: String(voucher.minPaidOrders),
    allowlist: voucher.allowlist.join("\n"),
    totalUses: voucher.totalUses === null ? "" : String(voucher.totalUses),
    perCustomer: String(voucher.perCustomer),
    startLocal: isoToLocal(voucher.startAt),
    endLocal: isoToLocal(voucher.endAt),
    visibility: voucher.visibility,
  };
}

export function toVoucherRequest(values: VoucherFormValues) {
  return {
    code: values.code,
    name: values.name,
    description: values.description,
    scope: values.scope,
    eventId: values.scope === "event" && values.eventId ? values.eventId : null,
    ticketTypeIds: list(values.ticketTypeIds),
    excludedEventIds: list(values.excludedEventIds),
    eventTypeIds: values.eventTypeIds,
    discountType: values.discountType,
    value: whole(values.value),
    maxDiscount: values.discountType === "percent" ? optional(values.maxDiscount) : null,
    minSeats: whole(values.minSeats),
    minSubtotal: whole(values.minSubtotal),
    eligibility: values.eligibility,
    minPaidOrders: whole(values.minPaidOrders),
    allowlist: list(values.allowlist),
    totalUses: optional(values.totalUses),
    perCustomer: whole(values.perCustomer),
    startAt: localToIso(values.startLocal),
    endAt: localToIso(values.endLocal),
    visibility: values.visibility,
  };
}
