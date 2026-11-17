// Shop import jobs and carts (ADR-0028, docs/03 §9.3): TTL and lookup indexes.
// Expand only. Idempotent; never edit once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db
    .collection("import_jobs")
    .createIndexes([
      { key: { expiresAt: 1 }, name: "idx_import_jobs_expires_at_ttl", expireAfterSeconds: 0 },
    ]);
  await db.collection("carts").createIndexes([
    { key: { tokenHash: 1 }, name: "idx_carts_token_hash_uq", unique: true },
    {
      key: { userId: 1 },
      name: "idx_carts_user_id",
      partialFilterExpression: { userId: { $type: "string" } },
    },
    { key: { expiresAt: 1 }, name: "idx_carts_expires_at_ttl", expireAfterSeconds: 0 },
  ]);
};
