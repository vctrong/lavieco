// Event page redesign (22/10/2026, docs/03 §9.2): new optional fields get their
// defaults, and `pricing.isFree` is recomputed with its new meaning ("every visible
// ticket type costs 0", was "any"). Expand only: nothing is removed.
// Idempotent; never edit once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  const events = db.collection("events");
  const defaults = {
    banner: null,
    minAge: null,
    benefits: [],
    cancellationRules: [],
    attendance: { count: null, approvedAt: null, approvedBy: null },
    cancellation: null,
  };
  for (const [field, value] of Object.entries(defaults)) {
    await events.updateMany({ [field]: { $exists: false } }, { $set: { [field]: value } });
  }
  // Speakers gain bio + avatar, agenda items a description (array filters keep it idempotent).
  await events.updateMany(
    { "speakers.bio": { $exists: false }, "speakers.0": { $exists: true } },
    { $set: { "speakers.$[s].bio": "", "speakers.$[s].avatar": null } },
    { arrayFilters: [{ "s.bio": { $exists: false } }] },
  );
  await events.updateMany(
    { "agenda.description": { $exists: false }, "agenda.0": { $exists: true } },
    { $set: { "agenda.$[a].description": "" } },
    { arrayFilters: [{ "a.description": { $exists: false } }] },
  );

  // isFree = at least one visible ticket type and all of them at 0.
  const ranges = await db
    .collection("ticket_types")
    .aggregate([
      { $match: { hidden: false } },
      { $group: { _id: "$eventId", min: { $min: "$price" }, max: { $max: "$price" } } },
    ])
    .toArray();
  for (const range of ranges) {
    await events.updateOne(
      { _id: range._id },
      { $set: { "pricing.isFree": range.max === 0, "pricing.priceFrom": range.min } },
    );
  }
};
