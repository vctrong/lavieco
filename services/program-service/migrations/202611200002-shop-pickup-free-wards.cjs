// Shop settings of 20/11/2026: pickup at FPT University Cần Thơ, free delivery to the
// wards of the former Ninh Kiều district. Data only, idempotent; never edit once run.
// A settings document saved by staff keeps its own pickup address unless it is still
// the old default "Cần Thơ".

const FREE_WARDS = [31120, 31135, 31147, 31150];

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  const settings = db.collection("shop_settings");
  await settings.updateOne(
    { _id: "settings", "pickup.address": "Cần Thơ" },
    { $set: { "pickup.address": "Trường Đại học FPT Cần Thơ" }, $inc: { revision: 1 } },
  );
  await settings.updateOne(
    { _id: "settings", freeShippingWardCodes: { $exists: false } },
    { $set: { freeShippingWardCodes: FREE_WARDS }, $inc: { revision: 1 } },
  );
};
