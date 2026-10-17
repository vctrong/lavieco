// Phase 2b (ADR-0020): `events.cover` becomes a media snapshot { mediaId, publicId,
// width, height, alt } and `events.gallery` appears. Phase 2 never stored a real cover
// (illustration only), so an old { url, alt } cover is dropped rather than converted.
// Idempotent; never edit once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  const events = db.collection("events");
  await events.updateMany(
    { cover: { $ne: null }, "cover.mediaId": { $exists: false } },
    { $set: { cover: null } },
  );
  await events.updateMany({ gallery: { $exists: false } }, { $set: { gallery: [] } });
};
