import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import {
  SALES_CHANNELS,
  SALES_ORDER_SOURCES,
  SALES_ORDER_STATUSES,
  SALES_ORDER_TYPES,
  SALES_PAYMENT_METHODS,
  SALES_PAYMENT_STATUSES,
} from "@lavieco/shared/sales";

export const SALES_ORDER_MODEL = "SalesOrder";
export const PRICE_LIST_ITEM_MODEL = "PriceListItem";
export const COUNTER_MODEL = "Counter";

const staffRef = new Schema(
  { id: { type: String, required: true }, name: { type: String, default: "" } },
  { _id: false },
);

const address = new Schema(
  {
    provinceCode: { type: Number, default: null },
    provinceName: { type: String, default: "" },
    wardCode: { type: Number, default: null },
    wardName: { type: String, default: "" },
    detail: { type: String, default: "" },
    full: { type: String, default: "" },
  },
  { _id: false },
);

const item = new Schema(
  {
    priceItemId: { type: String, default: null },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

/**
 * `sales_orders` (docs/03 §9.5, ADR-0030): the team's order book. Customer fields are
 * personal data, kept apart from the money fields (DQ8). `items` ≤ 50.
 */
export const salesOrderSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    code: { type: String, required: true },
    legacyCode: { type: String, default: null },
    source: { type: String, enum: SALES_ORDER_SOURCES, required: true },
    shopOrderId: { type: String, default: null },
    orderType: { type: String, enum: SALES_ORDER_TYPES, required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, default: "" },
      phoneNormalized: { type: String, default: null },
      address: { type: address, default: null },
    },
    channel: { type: String, enum: SALES_CHANNELS, required: true },
    items: { type: [item], default: [] },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    discount: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: [...SALES_PAYMENT_METHODS, null], default: null },
    paymentStatus: { type: String, enum: SALES_PAYMENT_STATUSES, required: true },
    status: { type: String, enum: SALES_ORDER_STATUSES, required: true },
    orderDay: { type: String, default: null },
    dueDay: { type: String, default: null },
    assignee: { type: staffRef, default: null },
    note: { type: String, default: "" },
    /** Name, code, old code and phone without accents: what the search box matches. */
    search: { key: { type: String, default: "" } },
    createdBy: { type: staffRef, default: null },
    updatedBy: { type: staffRef, default: null },
    deletedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "sales_orders", timestamps: true, minimize: false },
);
salesOrderSchema.index({ code: 1 }, { name: "idx_sales_orders_code_uq", unique: true });
salesOrderSchema.index(
  { legacyCode: 1 },
  {
    name: "idx_sales_orders_legacy_code_uq",
    unique: true,
    partialFilterExpression: { legacyCode: { $type: "string" } },
  },
);
salesOrderSchema.index(
  { shopOrderId: 1 },
  {
    name: "idx_sales_orders_shop_order_id_uq",
    unique: true,
    partialFilterExpression: { shopOrderId: { $type: "string" } },
  },
);
salesOrderSchema.index({ deletedAt: 1, status: 1 }, { name: "idx_sales_orders_deleted_at_status" });
salesOrderSchema.index({ dueDay: 1 }, { name: "idx_sales_orders_due_day" });
salesOrderSchema.index({ paymentStatus: 1 }, { name: "idx_sales_orders_payment_status" });
salesOrderSchema.index({ "assignee.id": 1 }, { name: "idx_sales_orders_assignee_id" });
salesOrderSchema.index({ orderDay: -1 }, { name: "idx_sales_orders_order_day" });
salesOrderSchema.index(
  { "customer.phoneNormalized": 1, orderDay: -1 },
  { name: "idx_sales_orders_customer_phone_normalized_order_day" },
);

/** `price_list_items`: the internal price list, no stock. */
export const priceListItemSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    name: { type: String, required: true },
    nameKey: { type: String, required: true },
    price: { type: Number, required: true },
    active: { type: Boolean, required: true, default: true },
    note: { type: String, default: "" },
    sortOrder: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "price_list_items", timestamps: true },
);
priceListItemSchema.index({ sortOrder: 1 }, { name: "idx_price_list_items_sort_order" });
priceListItemSchema.index({ nameKey: 1 }, { name: "idx_price_list_items_name_key" });

/** `counters`: one document per sequence (`_id: "sales_order"`). */
export const counterSchema = new Schema(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { collection: "counters", versionKey: false },
);

export const salesPersistence = MongooseModule.forFeature([
  { name: SALES_ORDER_MODEL, schema: salesOrderSchema },
  { name: PRICE_LIST_ITEM_MODEL, schema: priceListItemSchema },
  { name: COUNTER_MODEL, schema: counterSchema },
]);
