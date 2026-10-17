import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import { ORDER_STATUSES, PAYMENT_OUTCOMES, TICKET_STATUSES } from "@lavieco/shared/events";

export const ORDER_MODEL = "Order";
export const ORDER_ANSWER_MODEL = "OrderAnswer";
export const TICKET_MODEL = "Ticket";
export const PAYMENT_EVENT_MODEL = "PaymentEvent";

/**
 * `orders` (docs/03 §9.2). Personal data lives in `buyer` and `note` only, apart from
 * the financial fields kept ≥ 10 years (`orderCode`, `amount`, `paidAt`, refund
 * status, payOS ids). TODO(dq8-anonymize): anonymise `buyer`, `note` and the order's
 * `order_answers` 24 months after the event ends; set `anonymizedAt`.
 */
export const orderSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    orderCode: { type: Number, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: String, default: null },
    verificationId: { type: String, required: true },
    buyer: {
      type: new Schema(
        {
          fullName: { type: String, required: true },
          email: { type: String, required: true },
          emailNormalized: { type: String, required: true },
          phone: { type: String, required: true },
          phoneNormalized: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    items: {
      type: [
        new Schema(
          {
            ticketTypeId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            unitPrice: { type: Number, required: true },
            quantity: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    seatState: { type: String, enum: ["held", "sold", "released"], required: true },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundNote: { type: String, default: "" },
    note: { type: String, default: "" },
    consent: {
      type: new Schema({ version: String, at: Date }, { _id: false }),
      required: true,
    },
    safetyAcknowledgedAt: { type: Date, default: null },
    flags: {
      type: new Schema(
        {
          refundRequired: { type: Boolean, default: false },
          amountMismatch: { type: Boolean, default: false },
          latePayment: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    payment: {
      type: new Schema(
        {
          paymentLinkId: String,
          checkoutUrl: String,
          qrCode: String,
          bin: String,
          accountNumber: String,
          accountName: String,
          description: String,
          expiresAt: Date,
        },
        { _id: false },
      ),
      default: null,
    },
    lastReconciledAt: { type: Date, default: null },
    anonymizedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "orders", timestamps: true },
);

orderSchema.index({ orderCode: 1 }, { name: "idx_orders_order_code_uq", unique: true });
orderSchema.index({ verificationId: 1 }, { name: "idx_orders_verification_id_uq", unique: true });
orderSchema.index({ status: 1, expiresAt: 1 }, { name: "idx_orders_status_expires_at" });
orderSchema.index(
  { eventId: 1, status: 1, createdAt: -1 },
  { name: "idx_orders_event_id_status_created_at" },
);
orderSchema.index(
  { "buyer.emailNormalized": 1, createdAt: -1 },
  { name: "idx_orders_buyer_email_created_at" },
);
orderSchema.index({ createdAt: -1 }, { name: "idx_orders_created_at" });

/** `order_answers`: custom form answers, one document per order (personal data). */
export const orderAnswerSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    orderId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    answers: {
      type: [
        new Schema(
          { questionId: { type: String, required: true }, value: Schema.Types.Mixed },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { collection: "order_answers", timestamps: true },
);

orderAnswerSchema.index({ orderId: 1 }, { name: "idx_order_answers_order_id_uq", unique: true });

/** `tickets`: one per seat, no personal data (BR-13, BR-16). */
export const ticketSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    code: { type: String, required: true },
    qrToken: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, required: true },
    eventId: { type: Schema.Types.ObjectId, required: true },
    ticketTypeId: { type: Schema.Types.ObjectId, required: true },
    ticketTypeName: { type: String, required: true },
    status: { type: String, enum: TICKET_STATUSES, required: true, default: "valid" },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: String, default: null },
    voidedAt: { type: Date, default: null },
  },
  { collection: "tickets", timestamps: true },
);

ticketSchema.index({ code: 1 }, { name: "idx_tickets_code_uq", unique: true });
ticketSchema.index({ qrToken: 1 }, { name: "idx_tickets_qr_token_uq", unique: true });
ticketSchema.index({ orderId: 1 }, { name: "idx_tickets_order_id" });
ticketSchema.index({ eventId: 1, status: 1 }, { name: "idx_tickets_event_id_status" });

/**
 * `payment_events`: verified payOS notifications and reconciliations, reconciliation
 * fields only (never the payer's name or account, docs/05). Financial: kept ≥ 10 years.
 */
export const paymentEventSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    orderCode: { type: Number, required: true },
    source: { type: String, enum: ["webhook", "reconcile"], required: true },
    amount: { type: Number, required: true },
    reference: { type: String, default: null },
    paymentLinkId: { type: String, default: null },
    transactionAt: { type: String, default: null },
    outcome: { type: String, enum: PAYMENT_OUTCOMES, required: true },
  },
  { collection: "payment_events", timestamps: true },
);

paymentEventSchema.index(
  { orderCode: 1, createdAt: 1 },
  { name: "idx_payment_events_order_code_created_at" },
);

export const orderPersistence = MongooseModule.forFeature([
  { name: ORDER_MODEL, schema: orderSchema },
  { name: ORDER_ANSWER_MODEL, schema: orderAnswerSchema },
  { name: TICKET_MODEL, schema: ticketSchema },
  { name: PAYMENT_EVENT_MODEL, schema: paymentEventSchema },
]);
