// Vouchers (PR4 of docs/ke-hoach-chuong-trinh-v2.md, docs/03 §9.2): collections, indexes,
// and orders gaining `subtotal`/`discount` (every order so far had no discount).
// Expand only. Idempotent; never edit once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("vouchers").createIndexes([
    { key: { code: 1 }, name: "idx_vouchers_code_uq", unique: true },
    { key: { scope: 1, status: 1, createdAt: -1 }, name: "idx_vouchers_scope_status_created_at" },
    { key: { eventId: 1, status: 1 }, name: "idx_vouchers_event_id_status" },
  ]);
  await db.collection("voucher_redemptions").createIndexes([
    {
      key: { voucherId: 1, customerKey: 1, slot: 1 },
      name: "idx_voucher_redemptions_voucher_customer_slot_uq",
      unique: true,
      partialFilterExpression: { active: true },
    },
    { key: { orderId: 1 }, name: "idx_voucher_redemptions_order_id_uq", unique: true },
    {
      key: { voucherId: 1, emailNormalized: 1, active: 1 },
      name: "idx_voucher_redemptions_voucher_email_active",
    },
  ]);
  await db.collection("rate_limit_buckets").createIndexes([
    { key: { key: 1 }, name: "idx_rate_limit_buckets_key_uq", unique: true },
    { key: { expiresAt: 1 }, name: "idx_rate_limit_buckets_expires_at", expireAfterSeconds: 0 },
  ]);

  const orders = db.collection("orders");
  await orders.updateMany({ subtotal: { $exists: false } }, [
    { $set: { subtotal: "$amount", discount: null } },
  ]);
  await orders.createIndexes([
    {
      key: { "discount.voucherId": 1, status: 1 },
      name: "idx_orders_discount_voucher_id_status",
      partialFilterExpression: { "discount.voucherId": { $exists: true } },
    },
    {
      key: { userId: 1, status: 1 },
      name: "idx_orders_user_id_status",
    },
  ]);
};
