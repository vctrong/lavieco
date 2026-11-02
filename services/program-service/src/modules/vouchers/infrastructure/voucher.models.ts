import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import {
  VOUCHER_DISCOUNT_TYPES,
  VOUCHER_ELIGIBILITIES,
  VOUCHER_SCOPES,
  VOUCHER_STATUSES,
  VOUCHER_VISIBILITIES,
} from "@lavieco/shared/events";

export const VOUCHER_MODEL = "Voucher";
export const VOUCHER_REDEMPTION_MODEL = "VoucherRedemption";
export const RATE_LIMIT_BUCKET_MODEL = "RateLimitBucket";

/** `vouchers` (docs/03 §9.2). `used`/`held` only move through conditional `$inc` with orders. */
export const voucherSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: VOUCHER_STATUSES, required: true, default: "active" },
    scope: { type: String, enum: VOUCHER_SCOPES, required: true },
    eventId: { type: Schema.Types.ObjectId, default: null },
    ticketTypeIds: { type: [String], default: [] },
    excludedEventIds: { type: [String], default: [] },
    eventTypeIds: { type: [String], default: [] },
    discountType: { type: String, enum: VOUCHER_DISCOUNT_TYPES, required: true },
    value: { type: Number, required: true },
    maxDiscount: { type: Number, default: null },
    minSeats: { type: Number, default: 1 },
    minSubtotal: { type: Number, default: 0 },
    eligibility: { type: String, enum: VOUCHER_ELIGIBILITIES, required: true },
    minPaidOrders: { type: Number, default: 2 },
    /** ≤ VOUCHER_LIMITS.allowlistMax, normalised emails; personal data. */
    allowlist: { type: [String], default: [] },
    totalUses: { type: Number, default: null },
    perCustomer: { type: Number, default: 1 },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    visibility: { type: String, enum: VOUCHER_VISIBILITIES, required: true },
    used: { type: Number, required: true, default: 0 },
    held: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "vouchers", timestamps: true },
);
voucherSchema.index({ code: 1 }, { name: "idx_vouchers_code_uq", unique: true });
voucherSchema.index(
  { scope: 1, status: 1, createdAt: -1 },
  { name: "idx_vouchers_scope_status_created_at" },
);
voucherSchema.index({ eventId: 1, status: 1 }, { name: "idx_vouchers_event_id_status" });

/**
 * `voucher_redemptions`: one per order using a code. `active` (held or redeemed) keeps a
 * partial unique index that enforces `perCustomer` through `slot`, without `$ne`.
 * `customerKey`/`emailNormalized` are personal data: anonymised with the order (DQ8).
 */
export const voucherRedemptionSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    voucherId: { type: Schema.Types.ObjectId, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    customerKey: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    slot: { type: Number, required: true },
    state: { type: String, enum: ["held", "redeemed", "released"], required: true },
    active: { type: Boolean, required: true },
    heldAt: { type: Date, default: null },
    redeemedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
  },
  { collection: "voucher_redemptions", timestamps: true },
);
voucherRedemptionSchema.index(
  { voucherId: 1, customerKey: 1, slot: 1 },
  {
    name: "idx_voucher_redemptions_voucher_customer_slot_uq",
    unique: true,
    partialFilterExpression: { active: true },
  },
);
voucherRedemptionSchema.index(
  { orderId: 1 },
  { name: "idx_voucher_redemptions_order_id_uq", unique: true },
);
voucherRedemptionSchema.index(
  { voucherId: 1, emailNormalized: 1, active: 1 },
  { name: "idx_voucher_redemptions_voucher_email_active" },
);

/** `rate_limit_buckets`: fixed windows (no Redis in stage 1); `key` is an HMAC. */
export const rateLimitBucketSchema = new Schema(
  {
    key: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "rate_limit_buckets", versionKey: false },
);
rateLimitBucketSchema.index({ key: 1 }, { name: "idx_rate_limit_buckets_key_uq", unique: true });
rateLimitBucketSchema.index(
  { expiresAt: 1 },
  { name: "idx_rate_limit_buckets_expires_at", expireAfterSeconds: 0 },
);

export const voucherPersistence = MongooseModule.forFeature([
  { name: VOUCHER_MODEL, schema: voucherSchema },
  { name: VOUCHER_REDEMPTION_MODEL, schema: voucherRedemptionSchema },
  { name: RATE_LIMIT_BUCKET_MODEL, schema: rateLimitBucketSchema },
]);
