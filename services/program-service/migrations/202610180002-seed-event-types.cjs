// Seed program types managed by admins afterwards (docs/05: Workshop, Talkshow, Triển lãm).
// Reference data, not accounts: upsert by `key`, never overwrites an admin's edits.

const SEED = [
  { key: "workshop", name: { vi: "Workshop", en: "Workshop" }, sortOrder: 10 },
  { key: "talkshow", name: { vi: "Talkshow", en: "Talk" }, sortOrder: 20 },
  { key: "trien-lam", name: { vi: "Triển lãm", en: "Exhibition" }, sortOrder: 30 },
];

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  const now = new Date();
  for (const type of SEED) {
    await db.collection("event_types").updateOne(
      { key: type.key },
      {
        $setOnInsert: {
          schemaVersion: 1,
          key: type.key,
          name: type.name,
          sortOrder: type.sortOrder,
          archivedAt: null,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
};
