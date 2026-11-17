// Product reviews (BR-24, docs/03 §9.3). Expand only. Idempotent; never edit once it has run.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("product_reviews").createIndexes([
    {
      key: { orderId: 1, variantId: 1 },
      name: "idx_product_reviews_order_id_variant_id_uq",
      unique: true,
    },
    {
      key: { productId: 1, status: 1, createdAt: -1 },
      name: "idx_product_reviews_product_id_status_created_at",
    },
    { key: { status: 1, createdAt: -1 }, name: "idx_product_reviews_status_created_at" },
  ]);
};
