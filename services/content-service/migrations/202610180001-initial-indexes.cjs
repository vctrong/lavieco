// Initial collections and indexes of lavieco_content (docs/03 §5.8, §10.2): media + outbox.
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("media").createIndexes([
    // The sweep of abandoned (pending) uploads.
    { key: { status: 1, createdAt: 1 }, name: "idx_media_status_created_at" },
    {
      key: { "owner.userId": 1 },
      name: "idx_media_owner_avatar_uq",
      unique: true,
      // One live avatar per member. Equality on a flag, never $ne (docs/03 §10.2).
      partialFilterExpression: { purpose: "avatar", live: true },
    },
    { key: { "attachedTo.id": 1 }, name: "idx_media_attached_to" },
  ]);

  await db.collection("outbox").createIndexes([
    { key: { status: 1, availableAt: 1 }, name: "idx_outbox_status_available_at" },
    { key: { purgeAt: 1 }, name: "idx_outbox_purge_at", expireAfterSeconds: 0 },
  ]);
};
