// Staff alerts by Web Push (ADR-0027): device subscriptions, topic choices and the
// idempotency log of fanned-out notifications. Idempotent: createIndex with the same name
// and options is a no-op. Never edit this file once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("push_subscriptions").createIndexes([
    { key: { endpointHash: 1 }, name: "idx_push_subscriptions_endpoint_hash_uq", unique: true },
    { key: { userId: 1, createdAt: -1 }, name: "idx_push_subscriptions_user_id_created_at" },
  ]);
  await db
    .collection("push_preferences")
    .createIndexes([{ key: { userId: 1 }, name: "idx_push_preferences_user_id_uq", unique: true }]);
  await db.collection("push_deliveries").createIndexes([
    {
      key: { notificationId: 1 },
      name: "idx_push_deliveries_notification_id_uq",
      unique: true,
    },
    {
      key: { createdAt: 1 },
      name: "idx_push_deliveries_created_at",
      expireAfterSeconds: 7 * 24 * 60 * 60,
    },
  ]);
};
