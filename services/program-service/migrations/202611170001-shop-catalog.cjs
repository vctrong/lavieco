// Shop catalogue (ADR-0028, docs/03 §9.3): collections, indexes and the seed categories
// of docs/08. Expand only. Idempotent; never edit once it has run anywhere.

const SEED_CATEGORIES = [
  [
    "phu-kien-vo-nguyen-ban",
    "Phụ kiện từ vỏ nguyên bản",
    "Móc khoá, phone charm, dây chuyền từ vỏ sò được tuyển chọn",
  ],
  [
    "gom-bot-vo-so",
    "Gốm bột vỏ sò",
    "Chậu cây, lót ly, đĩa đựng trang sức, ly nến thơm đúc từ bột vỏ sò",
  ],
  [
    "combo-qua-tang-xanh",
    "Combo quà tặng xanh",
    "Sản phẩm kèm story card, bao bì kraft và mã QR vào Cẩm nang",
  ],
  ["doi-tac-xanh", "Đối tác xanh", "Sản phẩm từ vật liệu tái chế của các thương hiệu đối tác"],
];

/** @param {import("mongodb").Db} db */
exports.up = async function up(db) {
  await db.collection("product_categories").createIndexes([
    { key: { key: 1 }, name: "idx_product_categories_key_uq", unique: true },
    { key: { sortOrder: 1 }, name: "idx_product_categories_sort_order" },
  ]);
  await db
    .collection("partner_brands")
    .createIndexes([{ key: { slug: 1 }, name: "idx_partner_brands_slug_uq", unique: true }]);
  await db.collection("products").createIndexes([
    { key: { slug: 1 }, name: "idx_products_slug_uq", unique: true },
    { key: { slugHistory: 1 }, name: "idx_products_slug_history" },
    {
      key: { live: 1, categoryId: 1, sortOrder: 1, publishedAt: -1 },
      name: "idx_products_live_category_id_sort_order",
    },
    { key: { live: 1, priceMin: 1 }, name: "idx_products_live_price_min" },
    { key: { partnerBrandId: 1 }, name: "idx_products_partner_brand_id" },
    { key: { status: 1, updatedAt: -1 }, name: "idx_products_status_updated_at" },
    { key: { "search.key": 1 }, name: "idx_products_search_key" },
  ]);
  await db.collection("product_variants").createIndexes([
    { key: { sku: 1 }, name: "idx_product_variants_sku_uq", unique: true },
    { key: { productId: 1, sortOrder: 1 }, name: "idx_product_variants_product_id_sort_order" },
    {
      key: { productId: 1, optionKey: 1 },
      name: "idx_product_variants_product_id_option_key_uq",
      unique: true,
      partialFilterExpression: { status: "active" },
    },
  ]);
  await db
    .collection("stock_movements")
    .createIndexes([{ key: { variantId: 1, at: -1 }, name: "idx_stock_movements_variant_id_at" }]);

  const now = new Date();
  const categories = db.collection("product_categories");
  for (const [index, [key, name, description]] of SEED_CATEGORIES.entries()) {
    await categories.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          name,
          description,
          sortOrder: index,
          archivedAt: null,
          revision: 1,
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
};
