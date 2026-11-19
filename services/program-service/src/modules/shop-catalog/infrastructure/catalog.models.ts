import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import {
  IMPACT_STATUSES,
  PRODUCT_BADGES,
  PRODUCT_STATUSES,
  STOCK_MOVEMENT_TYPES,
} from "@lavieco/shared/shop";

export const PRODUCT_CATEGORY_MODEL = "ProductCategory";
export const PARTNER_BRAND_MODEL = "PartnerBrand";
export const PRODUCT_MODEL = "Product";
export const PRODUCT_VARIANT_MODEL = "ProductVariant";
export const STOCK_MOVEMENT_MODEL = "StockMovement";
export const SHOP_SETTINGS_MODEL = "ShopSettings";

const imageSnapshot = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, required: true },
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, default: "" },
  },
  { _id: false },
);

/** `product_categories` (docs/03 §9.3): `key` never changes once created. */
export const productCategorySchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, required: true, default: 0 },
    archivedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "product_categories", timestamps: true },
);
productCategorySchema.index({ key: 1 }, { name: "idx_product_categories_key_uq", unique: true });
productCategorySchema.index({ sortOrder: 1 }, { name: "idx_product_categories_sort_order" });

/** `partner_brands`: no personal contact data; `commissionRate` (‰) is admin only (BR-25). */
export const partnerBrandSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    story: { type: String, default: "" },
    website: { type: String, default: "" },
    logo: { type: imageSnapshot, default: null },
    commissionRate: { type: Number, required: true, default: 0 },
    active: { type: Boolean, required: true, default: true },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "partner_brands", timestamps: true },
);
partnerBrandSchema.index({ slug: 1 }, { name: "idx_partner_brands_slug_uq", unique: true });

const optionSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    values: { type: [{ key: String, label: String, _id: false }], default: [] },
  },
  { _id: false },
);

/** `products` (docs/03 §9.3). Embedded arrays are capped by the Zod contract (SHOP_LIMITS). */
export const productSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    slug: { type: String, required: true },
    slugHistory: { type: [String], default: [] },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, required: true },
    partnerBrandId: { type: Schema.Types.ObjectId, default: null },
    story: {
      message: { type: String, default: "" },
      story: { type: String, default: "" },
      lesson: { type: String, default: "" },
    },
    handbookLink: { type: { slug: String, title: String, _id: false }, default: null },
    materials: { type: [String], default: [] },
    care: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    leadTimeDays: { type: Number, default: null },
    options: { type: [optionSchema], default: [] },
    images: {
      type: [
        new Schema(
          { ...imageSnapshot.obj, variantValues: { type: [String], default: [] } },
          { _id: false },
        ),
      ],
      default: [],
    },
    impact: {
      items: {
        type: [{ label: String, value: String, unit: String, source: String, _id: false }],
        default: [],
      },
      status: { type: String, enum: IMPACT_STATUSES, default: "none" },
      approvedBy: { type: String, default: null },
      approvedAt: { type: Date, default: null },
    },
    seo: { title: { type: String, default: "" }, description: { type: String, default: "" } },
    badges: { type: [String], enum: PRODUCT_BADGES, default: [] },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, required: true, default: "draft" },
    /** Partial indexes cannot use `$ne`, hence the flag (docs/03 §10.2). */
    live: { type: Boolean, required: true, default: false },
    priceMin: { type: Number, required: true, default: 0 },
    priceMax: { type: Number, required: true, default: 0 },
    search: { key: { type: String, default: "" } },
    publishedAt: { type: Date, default: null },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "products", timestamps: true },
);
productSchema.index({ slug: 1 }, { name: "idx_products_slug_uq", unique: true });
productSchema.index({ slugHistory: 1 }, { name: "idx_products_slug_history" });
productSchema.index(
  { live: 1, categoryId: 1, sortOrder: 1, publishedAt: -1 },
  { name: "idx_products_live_category_id_sort_order" },
);
productSchema.index({ live: 1, priceMin: 1 }, { name: "idx_products_live_price_min" });
productSchema.index({ partnerBrandId: 1 }, { name: "idx_products_partner_brand_id" });
productSchema.index({ status: 1, updatedAt: -1 }, { name: "idx_products_status_updated_at" });
productSchema.index({ "search.key": 1 }, { name: "idx_products_search_key" });

/** `product_variants`: stock only moves through conditional `$inc` (BR-22). */
export const productVariantSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    productId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    optionKey: { type: String, required: true },
    optionValues: { type: Schema.Types.Mixed, default: {} },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: null },
    lowStockThreshold: { type: Number, required: true, default: 3 },
    weightGrams: { type: Number, default: null },
    status: { type: String, enum: ["active", "archived"], required: true, default: "active" },
    madeToOrder: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    stock: {
      onHand: { type: Number, required: true, default: 0 },
      held: { type: Number, required: true, default: 0 },
      sold: { type: Number, required: true, default: 0 },
    },
  },
  { collection: "product_variants", timestamps: true },
);
productVariantSchema.index({ sku: 1 }, { name: "idx_product_variants_sku_uq", unique: true });
productVariantSchema.index(
  { productId: 1, sortOrder: 1 },
  { name: "idx_product_variants_product_id_sort_order" },
);
productVariantSchema.index(
  { productId: 1, optionKey: 1 },
  {
    name: "idx_product_variants_product_id_option_key_uq",
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);

/** `stock_movements`: append only (the DB role has find + insert on it). */
export const stockMovementSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    variantId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    delta: { type: Number, required: true },
    reason: { type: String, default: "" },
    orderId: { type: Schema.Types.ObjectId, default: null },
    importJobId: { type: Schema.Types.ObjectId, default: null },
    actorId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { collection: "stock_movements", timestamps: false, versionKey: false },
);
stockMovementSchema.index({ variantId: 1, at: -1 }, { name: "idx_stock_movements_variant_id_at" });

/** `shop_settings`: one document (`_id: "settings"`). */
export const shopSettingsSchema = new Schema(
  {
    _id: { type: String, required: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    shippingFee: { type: Number, required: true },
    freeShippingFrom: { type: Number, default: null },
    freeShippingWardCodes: { type: [Number], default: undefined },
    pickup: { enabled: Boolean, address: String, note: String },
    cod: { enabled: Boolean, maxAmount: Number },
    holdMinutes: { type: Number, required: true },
    returnDays: { type: Number, required: true },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "shop_settings", timestamps: true },
);

export const catalogPersistence = MongooseModule.forFeature([
  { name: PRODUCT_CATEGORY_MODEL, schema: productCategorySchema },
  { name: PARTNER_BRAND_MODEL, schema: partnerBrandSchema },
  { name: PRODUCT_MODEL, schema: productSchema },
  { name: PRODUCT_VARIANT_MODEL, schema: productVariantSchema },
  { name: STOCK_MOVEMENT_MODEL, schema: stockMovementSchema },
  { name: SHOP_SETTINGS_MODEL, schema: shopSettingsSchema },
]);
