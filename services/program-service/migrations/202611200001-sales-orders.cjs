// Sales orders, price list and counters (ADR-0030, docs/03 §9.5). Expand only.
// Idempotent; never edit once it has run.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("sales_orders").createIndexes([
    { key: { code: 1 }, name: "idx_sales_orders_code_uq", unique: true },
    {
      key: { legacyCode: 1 },
      name: "idx_sales_orders_legacy_code_uq",
      unique: true,
      partialFilterExpression: { legacyCode: { $type: "string" } },
    },
    {
      key: { shopOrderId: 1 },
      name: "idx_sales_orders_shop_order_id_uq",
      unique: true,
      partialFilterExpression: { shopOrderId: { $type: "string" } },
    },
    { key: { deletedAt: 1, status: 1 }, name: "idx_sales_orders_deleted_at_status" },
    { key: { dueDay: 1 }, name: "idx_sales_orders_due_day" },
    { key: { paymentStatus: 1 }, name: "idx_sales_orders_payment_status" },
    { key: { "assignee.id": 1 }, name: "idx_sales_orders_assignee_id" },
    { key: { orderDay: -1 }, name: "idx_sales_orders_order_day" },
    {
      key: { "customer.phoneNormalized": 1, orderDay: -1 },
      name: "idx_sales_orders_customer_phone_normalized_order_day",
    },
  ]);
  await db.collection("price_list_items").createIndexes([
    { key: { sortOrder: 1 }, name: "idx_price_list_items_sort_order" },
    { key: { nameKey: 1 }, name: "idx_price_list_items_name_key" },
  ]);
  // `counters` needs no index beyond `_id`; created on first use.
};
