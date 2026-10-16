// Initial collections and indexes of lavieco_identity (docs/03 §4, §10.2).
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere; add a new migration instead.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("users").createIndexes([
    { key: { emailNormalized: 1 }, name: "idx_users_email_normalized_uq", unique: true },
    { key: { status: 1 }, name: "idx_users_status" },
    {
      key: { googleSub: 1 },
      name: "idx_users_google_sub_uq",
      unique: true,
      partialFilterExpression: { googleSub: { $type: "string" } },
    },
  ]);

  await db.collection("sessions").createIndexes([
    { key: { tokenHash: 1 }, name: "idx_sessions_token_hash_uq", unique: true },
    { key: { userId: 1, revokedAt: 1 }, name: "idx_sessions_user_id_revoked_at" },
    { key: { familyId: 1 }, name: "idx_sessions_family_id" },
    { key: { expiresAt: 1 }, name: "idx_sessions_expires_at", expireAfterSeconds: 0 },
  ]);

  await db.collection("invitations").createIndexes([
    { key: { tokenHash: 1 }, name: "idx_invitations_token_hash_uq", unique: true },
    { key: { emailNormalized: 1 }, name: "idx_invitations_email_normalized" },
    { key: { purgeAt: 1 }, name: "idx_invitations_purge_at", expireAfterSeconds: 0 },
  ]);

  await db.collection("audit_events").createIndexes([
    { key: { at: -1 }, name: "idx_audit_events_at" },
    { key: { "actor.userId": 1, at: -1 }, name: "idx_audit_events_actor_at" },
    { key: { action: 1, at: -1 }, name: "idx_audit_events_action_at" },
    { key: { "target.type": 1, "target.id": 1, at: -1 }, name: "idx_audit_events_target_at" },
  ]);

  await db
    .collection("signing_keys")
    .createIndexes([{ key: { kid: 1 }, name: "idx_signing_keys_kid_uq", unique: true }]);

  await db.collection("otp_codes").createIndexes([
    { key: { challengeId: 1 }, name: "idx_otp_codes_challenge_id_uq", unique: true },
    { key: { purgeAt: 1 }, name: "idx_otp_codes_purge_at", expireAfterSeconds: 0 },
  ]);

  await db.collection("rate_limit_buckets").createIndexes([
    { key: { key: 1 }, name: "idx_rate_limit_buckets_key_uq", unique: true },
    { key: { expiresAt: 1 }, name: "idx_rate_limit_buckets_expires_at", expireAfterSeconds: 0 },
  ]);

  await db.collection("outbox").createIndexes([
    { key: { status: 1, availableAt: 1 }, name: "idx_outbox_status_available_at" },
    { key: { purgeAt: 1 }, name: "idx_outbox_purge_at", expireAfterSeconds: 0 },
  ]);
};
