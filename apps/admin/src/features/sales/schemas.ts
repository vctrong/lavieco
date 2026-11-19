import "@/shared/zod-vi";

import type { AddressValue } from "@lavieco/ui";
import type {
  SalesChannel,
  SalesOrder,
  SalesOrderInput,
  SalesOrderStatus,
  SalesOrderType,
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@lavieco/shared/sales";

import { TEXT } from "./constants/text";

export type OrderLine = {
  key: string;
  priceItemId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
};

/** What the order form holds while it is edited (also what its draft stores). */
export type OrderFormValues = {
  phone: string;
  name: string;
  address: AddressValue;
  items: OrderLine[];
  orderType: SalesOrderType;
  channel: SalesChannel;
  paymentMethod: SalesPaymentMethod | "";
  paymentStatus: SalesPaymentStatus;
  status: SalesOrderStatus;
  assigneeId: string;
  orderDay: string;
  dueDay: string;
  shippingFee: string;
  discount: string;
  note: string;
};

export const ORDER_FIELDS = [
  "phone",
  "name",
  "province",
  "ward",
  "items",
  "dueDay",
  "discount",
] as const;

const EMPTY_ADDRESS: AddressValue = { provinceCode: null, wardCode: null, detail: "" };

export function emptyOrderValues(today: string): OrderFormValues {
  return {
    phone: "",
    name: "",
    address: EMPTY_ADDRESS,
    items: [],
    orderType: "in_stock",
    channel: "in_person",
    paymentMethod: "",
    paymentStatus: "unpaid",
    status: "new",
    assigneeId: "",
    orderDay: today,
    dueDay: "",
    shippingFee: "0",
    discount: "0",
    note: "",
  };
}

export function addressValueOf(address: SalesOrder["customer"]["address"]): AddressValue {
  if (!address) return EMPTY_ADDRESS;
  if (address.provinceCode === null)
    return {
      provinceCode: address.detail ? "other" : null,
      wardCode: null,
      detail: address.detail,
    };
  return { provinceCode: address.provinceCode, wardCode: address.wardCode, detail: address.detail };
}

export function valuesOf(order: SalesOrder): OrderFormValues {
  return {
    phone: order.customer.phone,
    name: order.customer.name,
    address: addressValueOf(order.customer.address),
    items: order.items.map((item, index) => ({
      key: `line-${index}`,
      priceItemId: item.priceItemId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    orderType: order.orderType,
    channel: order.channel,
    paymentMethod: order.paymentMethod ?? "",
    paymentStatus: order.paymentStatus,
    status: order.status,
    assigneeId: order.assignee?.id ?? "",
    orderDay: order.orderDay ?? "",
    dueDay: order.dueDay ?? "",
    shippingFee: String(order.shippingFee),
    discount: String(order.discount),
    note: order.note,
  };
}

const amount = (text: string) => {
  const value = Number(text.replace(/[.\s]/g, ""));
  return Number.isInteger(value) && value >= 0 ? value : null;
};

/** Live display of the totals; the service computes them again on save. */
export function totalsOf(values: OrderFormValues) {
  const subtotal = values.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const shippingFee = amount(values.shippingFee) ?? 0;
  const discount = amount(values.discount) ?? 0;
  return { subtotal, shippingFee, discount, total: subtotal + shippingFee - discount };
}

const e = TEXT.vi.form;

/** Field errors of the current values (shown after the first submit). */
export function orderErrors(values: OrderFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const v = TEXT.vi.errors;
  if (!values.name.trim()) errors.name = e.nameRequired;
  const digits = values.phone.replace(/\D/g, "");
  if (values.phone.trim() && (digits.length < 9 || digits.length > 12))
    errors.phone = e.phoneInvalid;
  if (typeof values.address.provinceCode === "number" && values.address.wardCode === null)
    errors.ward = e.wardRequired;
  if (values.items.length === 0) errors.items = e.noItems;
  if (values.orderType === "made_to_order" && values.status !== "cancelled" && !values.dueDay)
    errors.dueDay = e.dueRequired;
  const totals = totalsOf(values);
  if (amount(values.shippingFee) === null) errors.discount = e.amountInvalid;
  if (amount(values.discount) === null || totals.total < 0) errors.discount = v.totals_invalid;
  return errors;
}

export function toOrderInput(values: OrderFormValues): SalesOrderInput {
  const totals = totalsOf(values);
  const { address } = values;
  const hasAddress = address.provinceCode !== null || address.detail.trim() !== "";
  return {
    orderType: values.orderType,
    customer: {
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: hasAddress
        ? {
            provinceCode: typeof address.provinceCode === "number" ? address.provinceCode : null,
            wardCode: typeof address.provinceCode === "number" ? address.wardCode : null,
            detail: address.detail.trim(),
          }
        : null,
    },
    channel: values.channel,
    items: values.items.map((line) => ({
      priceItemId: line.priceItemId,
      name: line.name,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
    })),
    shippingFee: totals.shippingFee,
    discount: totals.discount,
    paymentMethod: values.paymentMethod || null,
    paymentStatus: values.paymentStatus,
    status: values.status,
    orderDay: values.orderDay || null,
    dueDay: values.dueDay || null,
    assigneeId: values.assigneeId || null,
    note: values.note.trim(),
  };
}
