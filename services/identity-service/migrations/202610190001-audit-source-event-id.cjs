// Audit events sent by other services through their outbox are recorded once (ADR-0021).
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("audit_events").createIndexes([
    {
      key: { sourceEventId: 1 },
      name: "idx_audit_events_source_event_id_uq",
      unique: true,
      partialFilterExpression: { sourceEventId: { $type: "string" } },
    },
  ]);
};
