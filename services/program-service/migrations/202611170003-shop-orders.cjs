// Shop orders (ADR-0028, docs/03 §9.3). Expand only. Idempotent; never edit once it has run.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("shop_orders").createIndexes([
    { key: { orderCode: 1 }, name: "idx_shop_orders_order_code_uq", unique: true },
    { key: { publicCode: 1 }, name: "idx_shop_orders_public_code_uq", unique: true },
    { key: { verificationId: 1 }, name: "idx_shop_orders_verification_id_uq", unique: true },
    { key: { status: 1, expiresAt: 1 }, name: "idx_shop_orders_status_expires_at" },
    {
      key: { "buyer.emailNormalized": 1, createdAt: -1 },
      name: "idx_shop_orders_buyer_email_normalized_created_at",
    },
    { key: { userId: 1, createdAt: -1 }, name: "idx_shop_orders_user_id_created_at" },
    { key: { status: 1, createdAt: -1 }, name: "idx_shop_orders_status_created_at" },
  ]);
};
