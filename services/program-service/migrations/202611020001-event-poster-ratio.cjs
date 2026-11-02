// Poster shape (PR1 of docs/ke-hoach-chuong-trinh-v2.md, docs/03 §9.2): existing posters
// were all made for the 4:5 card. Expand only. Idempotent; never edit once it has run.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db
    .collection("events")
    .updateMany({ posterRatio: { $exists: false } }, { $set: { posterRatio: "4:5" } });
};
