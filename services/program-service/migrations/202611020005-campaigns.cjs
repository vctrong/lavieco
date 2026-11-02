// Bulk email (PR6 of docs/ke-hoach-chuong-trinh-v2.md, docs/03 §9.2, ADR-0026): collections,
// indexes, and events gaining "Sau sự kiện". Expand only. Idempotent; never edit once it has run.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("campaigns").createIndexes([
    { key: { status: 1, scheduledAt: 1 }, name: "idx_campaigns_status_scheduled_at" },
    { key: { createdAt: -1 }, name: "idx_campaigns_created_at" },
  ]);
  await db.collection("campaign_recipients").createIndexes([
    {
      key: { campaignId: 1, emailNormalized: 1 },
      name: "idx_campaign_recipients_campaign_id_email_uq",
      unique: true,
    },
    {
      key: { campaignId: 1, status: 1, nextAttemptAt: 1, _id: 1 },
      name: "idx_campaign_recipients_campaign_id_status_next_attempt",
    },
    { key: { status: 1, claimedAt: 1 }, name: "idx_campaign_recipients_status_claimed_at" },
  ]);
  await db
    .collection("email_suppressions")
    .createIndexes([
      { key: { emailNormalized: 1 }, name: "idx_email_suppressions_email_uq", unique: true },
    ]);
  await db
    .collection("campaign_daily_usage")
    .createIndexes([{ key: { day: 1 }, name: "idx_campaign_daily_usage_day_uq", unique: true }]);

  const events = db.collection("events");
  await events.updateMany(
    { postEvent: { $exists: false } },
    {
      $set: {
        postEvent: {
          enabled: false,
          delayHours: 24,
          audience: "checked_in",
          surveyId: null,
          mode: "draft",
        },
        postEventCampaignId: null,
      },
    },
  );
  await events.createIndexes([
    {
      key: { "postEvent.enabled": 1, postEventCampaignId: 1, endAt: 1 },
      name: "idx_events_post_event_enabled_campaign_end_at",
    },
  ]);
};
