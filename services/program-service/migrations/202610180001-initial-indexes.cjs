// Initial collections and indexes of lavieco_program (docs/03 §9.2, §10.2).
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("event_types").createIndexes([
    { key: { key: 1 }, name: "idx_event_types_key_uq", unique: true },
    { key: { sortOrder: 1 }, name: "idx_event_types_sort_order" },
  ]);

  await db.collection("events").createIndexes([
    {
      key: { slug: 1 },
      name: "idx_events_slug_uq",
      unique: true,
      // Discarded drafts free their slug. Equality on a flag, never $ne (docs/03 §10.2).
      partialFilterExpression: { discarded: false },
    },
    { key: { status: 1, startAt: -1 }, name: "idx_events_status_start_at" },
    { key: { typeId: 1, status: 1 }, name: "idx_events_type_id_status" },
  ]);

  await db
    .collection("ticket_types")
    .createIndexes([
      { key: { eventId: 1, sortOrder: 1 }, name: "idx_ticket_types_event_id_sort_order" },
    ]);

  await db.collection("preview_tokens").createIndexes([
    { key: { tokenHash: 1 }, name: "idx_preview_tokens_token_hash_uq", unique: true },
    { key: { expiresAt: 1 }, name: "idx_preview_tokens_expires_at", expireAfterSeconds: 0 },
  ]);

  await db.collection("outbox").createIndexes([
    { key: { status: 1, availableAt: 1 }, name: "idx_outbox_status_available_at" },
    { key: { purgeAt: 1 }, name: "idx_outbox_purge_at", expireAfterSeconds: 0 },
  ]);
};
