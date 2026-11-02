// Surveys (PR5 of docs/ke-hoach-chuong-trinh-v2.md, docs/03 §9.2, ADR-0025).
// Idempotent: createIndex with the same name and options is a no-op.
// Never edit this file once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("surveys").createIndexes([
    { key: { slug: 1 }, name: "idx_surveys_slug_uq", unique: true },
    { key: { kind: 1, status: 1, createdAt: -1 }, name: "idx_surveys_kind_status_created_at" },
    { key: { eventId: 1, status: 1 }, name: "idx_surveys_event_id_status" },
  ]);
  await db.collection("survey_responses").createIndexes([
    {
      key: { surveyId: 1, dedupeKey: 1 },
      name: "idx_survey_responses_survey_id_dedupe_key_uq",
      unique: true,
    },
    { key: { surveyId: 1, submittedAt: -1 }, name: "idx_survey_responses_survey_id_submitted_at" },
  ]);
};
