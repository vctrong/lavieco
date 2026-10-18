// Orders, form answers, tickets and payment events of lavieco_program (docs/03 §9.2, Phase 3).
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("orders").createIndexes([
    { key: { orderCode: 1 }, name: "idx_orders_order_code_uq", unique: true },
    // One email proof, one order: also makes a retried checkout idempotent.
    { key: { verificationId: 1 }, name: "idx_orders_verification_id_uq", unique: true },
    { key: { status: 1, expiresAt: 1 }, name: "idx_orders_status_expires_at" },
    {
      key: { eventId: 1, status: 1, createdAt: -1 },
      name: "idx_orders_event_id_status_created_at",
    },
    {
      key: { "buyer.emailNormalized": 1, createdAt: -1 },
      name: "idx_orders_buyer_email_created_at",
    },
    { key: { createdAt: -1 }, name: "idx_orders_created_at" },
  ]);

  await db
    .collection("order_answers")
    .createIndexes([{ key: { orderId: 1 }, name: "idx_order_answers_order_id_uq", unique: true }]);

  await db.collection("tickets").createIndexes([
    { key: { code: 1 }, name: "idx_tickets_code_uq", unique: true },
    { key: { qrToken: 1 }, name: "idx_tickets_qr_token_uq", unique: true },
    { key: { orderId: 1 }, name: "idx_tickets_order_id" },
    { key: { eventId: 1, status: 1 }, name: "idx_tickets_event_id_status" },
  ]);

  await db
    .collection("payment_events")
    .createIndexes([
      { key: { orderCode: 1, createdAt: 1 }, name: "idx_payment_events_order_code_created_at" },
    ]);
};
