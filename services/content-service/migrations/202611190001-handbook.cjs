// Digital Green Handbook (ADR-0029, docs/03 §5.1): handbooks, versions, chunked uploads,
// import jobs, preview tokens; and the media index that lets a re-uploaded page reuse
// its stored image. Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

const DAY = 24 * 60 * 60;

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("media").createIndexes([
    {
      key: { purpose: 1, sha256: 1 },
      name: "idx_media_purpose_sha256",
      partialFilterExpression: { live: true },
    },
  ]);

  await db
    .collection("handbooks")
    .createIndexes([{ key: { slug: 1 }, name: "idx_handbooks_slug_uq", unique: true }]);

  await db.collection("handbook_versions").createIndexes([
    {
      key: { handbookId: 1, number: -1 },
      name: "idx_handbook_versions_handbook_id_number_uq",
      unique: true,
    },
    {
      key: { handbookId: 1 },
      name: "idx_handbook_versions_draft_uq",
      unique: true,
      // One draft per handbook. Equality on the status, never $ne (docs/03 §10.2).
      partialFilterExpression: { status: "draft" },
    },
  ]);

  await db.collection("handbook_uploads").createIndexes([
    {
      key: { createdAt: 1 },
      name: "idx_handbook_uploads_created_at_ttl",
      expireAfterSeconds: 2 * DAY,
    },
  ]);

  await db.collection("handbook_import_jobs").createIndexes([
    { key: { status: 1, createdAt: 1 }, name: "idx_handbook_import_jobs_status_created_at" },
    {
      key: { handbookId: 1, createdAt: -1 },
      name: "idx_handbook_import_jobs_handbook_id_created_at",
    },
    {
      key: { createdAt: 1 },
      name: "idx_handbook_import_jobs_created_at_ttl",
      expireAfterSeconds: 30 * DAY,
    },
  ]);

  await db.collection("handbook_preview_tokens").createIndexes([
    { key: { tokenHash: 1 }, name: "idx_handbook_preview_tokens_token_hash_uq", unique: true },
    {
      key: { expiresAt: 1 },
      name: "idx_handbook_preview_tokens_expires_at_ttl",
      expireAfterSeconds: 0,
    },
  ]);
};
