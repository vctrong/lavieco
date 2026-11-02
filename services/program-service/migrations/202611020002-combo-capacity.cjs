// Combos and the shared capacity (PR3 of docs/ke-hoach-chuong-trinh-v2.md, docs/03 §9.2).
// Everything sold so far was one person per unit, so the event counters are the sums of
// its ticket types. Expand only. Idempotent; never edit once it has run anywhere.

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db
    .collection("ticket_types")
    .updateMany({ seatsPerUnit: { $exists: false } }, { $set: { seatsPerUnit: 1 } });
  await db
    .collection("tickets")
    .updateMany(
      { seatsPerUnit: { $exists: false } },
      { $set: { seatsPerUnit: 1, unitIndex: 1, seatIndex: 1 } },
    );
  await db
    .collection("orders")
    .updateMany(
      { "items.seatsPerUnit": { $exists: false } },
      { $set: { "items.$[item].seatsPerUnit": 1 } },
      { arrayFilters: [{ "item.seatsPerUnit": { $exists: false } }] },
    );

  const events = db.collection("events");
  const totals = await db
    .collection("ticket_types")
    .aggregate([
      {
        $group: {
          _id: "$eventId",
          sold: { $sum: { $ifNull: ["$sold", 0] } },
          held: { $sum: { $ifNull: ["$held", 0] } },
        },
      },
    ])
    .toArray();
  for (const total of totals) {
    await events.updateOne(
      { _id: total._id, seatsSold: { $exists: false } },
      { $set: { seatsSold: total.sold, seatsHeld: total.held } },
    );
  }
  await events.updateMany(
    { seatsSold: { $exists: false } },
    { $set: { seatsSold: 0, seatsHeld: 0 } },
  );
  await events.updateMany({ capacity: { $exists: false } }, { $set: { capacity: null } });
};
