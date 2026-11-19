import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import { cursorPageQuerySchema, cursorPageSchema } from "../common/pagination";
import { MEDIA_LIMITS } from "../media/limits";
import { mediaImageSchema } from "../media/media.schema";
import { SHOP_LIMITS } from "./limits";

// ---------------------------------------------------------------- enums

export const PRODUCT_STATUSES = ["draft", "published", "hidden", "archived"] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const PRODUCT_BADGES = ["new", "limited", "handmade"] as const;
export const productBadgeSchema = z.enum(PRODUCT_BADGES);
export type ProductBadge = z.infer<typeof productBadgeSchema>;

/** BR-23: impact figures stay hidden until someone with `impact:approve` approves them. */
export const IMPACT_STATUSES = ["none", "pending", "approved"] as const;
export const impactStatusSchema = z.enum(IMPACT_STATUSES);
export type ImpactStatus = z.infer<typeof impactStatusSchema>;

/** What blocks publishing (BR-20). The admin shows each as a checklist line. */
export const PRODUCT_PUBLISH_BLOCKERS = [
  "no_image",
  "image_alt_missing",
  "story_incomplete",
  "handbook_missing",
  "no_active_variant",
] as const;
export const productPublishBlockerSchema = z.enum(PRODUCT_PUBLISH_BLOCKERS);
export type ProductPublishBlocker = z.infer<typeof productPublishBlockerSchema>;

/** Public availability: visitors never see raw stock counts beyond "Còn N" when low. */
/** `made_to_order`: no stock, made once ordered (always orderable while active). */
export const AVAILABILITIES = ["in_stock", "low", "out", "made_to_order"] as const;
export const availabilitySchema = z.enum(AVAILABILITIES);
export type Availability = z.infer<typeof availabilitySchema>;

export const STOCK_MOVEMENT_TYPES = ["receive", "adjust", "sell", "return", "import"] as const;
export const stockMovementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

// ---------------------------------------------------------------- primitives

/** `chau-gom-mam-xanh`: lower-case ASCII words joined by single dashes. */
export const productSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(SHOP_LIMITS.slugMax)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lower-case letters, digits and single dashes");

/** `LV-POT-01-REU`: upper-cased on input so a typed `lv-pot-01` matches. */
export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(SHOP_LIMITS.skuMax)
  .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Letters, digits and dashes");

/** Option and option-value keys: stable ids derived from the label (`Xanh rêu` → `xanh-reu`). */
export const optionKeySchema = z
  .string()
  .min(1)
  .max(SHOP_LIMITS.optionValueMax)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const priceSchema = z.number().int().min(0).max(SHOP_LIMITS.priceMax);
const revisionSchema = z.number().int().min(1);
const text = (max: number) => z.string().trim().max(max);

// ---------------------------------------------------------------- categories

export const productCategorySchema = z.object({
  id: objectIdSchema,
  key: z.string(),
  name: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
  revision: z.number().int(),
});
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const productCategoryListSchema = z.object({ items: z.array(productCategorySchema) });

export const productCategoryCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(SHOP_LIMITS.categoryNameMax),
  description: text(SHOP_LIMITS.categoryDescriptionMax).default(""),
});
export type ProductCategoryCreateRequest = z.infer<typeof productCategoryCreateRequestSchema>;

export const productCategoryUpdateRequestSchema = productCategoryCreateRequestSchema.extend({
  sortOrder: z.number().int().min(0).max(10_000),
  archived: z.boolean(),
  revision: revisionSchema,
});
export type ProductCategoryUpdateRequest = z.infer<typeof productCategoryUpdateRequestSchema>;

// ---------------------------------------------------------------- partner brands

export const partnerBrandSchema = z.object({
  id: objectIdSchema,
  slug: z.string(),
  name: z.string(),
  story: z.string(),
  website: z.string(),
  logo: mediaImageSchema.nullable(),
  /** ‰, admin only: never sent to `web` (BR-25). */
  commissionRate: z.number().int(),
  active: z.boolean(),
  revision: z.number().int(),
});
export type PartnerBrand = z.infer<typeof partnerBrandSchema>;

export const partnerBrandListSchema = z.object({ items: z.array(partnerBrandSchema) });

export const partnerBrandUpsertRequestSchema = z.object({
  slug: productSlugSchema,
  name: z.string().trim().min(1).max(SHOP_LIMITS.brandNameMax),
  story: text(SHOP_LIMITS.brandStoryMax).default(""),
  website: z.union([z.literal(""), z.url().max(300)]).default(""),
  commissionRate: z.number().int().min(0).max(SHOP_LIMITS.commissionMax),
  active: z.boolean().default(true),
  /** Absent on create. */
  revision: revisionSchema.optional(),
});
export type PartnerBrandUpsertRequest = z.infer<typeof partnerBrandUpsertRequestSchema>;

// ---------------------------------------------------------------- product parts

export const productOptionSchema = z.object({
  key: optionKeySchema,
  name: z.string().trim().min(1).max(SHOP_LIMITS.optionNameMax),
  values: z
    .array(
      z.object({
        key: optionKeySchema,
        label: z.string().trim().min(1).max(SHOP_LIMITS.optionValueMax),
      }),
    )
    .min(1)
    .max(SHOP_LIMITS.optionValuesMax),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const productStorySchema = z.object({
  /** Thông điệp: one line the product carries. */
  message: text(SHOP_LIMITS.storyPartMax),
  /** Câu chuyện: where the material comes from, who made it. */
  story: text(SHOP_LIMITS.storyPartMax),
  /** Bài học: what a reader takes away (education first, BR-01). */
  lesson: text(SHOP_LIMITS.storyPartMax),
});
export type ProductStory = z.infer<typeof productStorySchema>;

export const handbookLinkSchema = z.object({
  slug: z.string().trim().min(1).max(SHOP_LIMITS.slugMax),
  title: z.string().trim().min(1).max(SHOP_LIMITS.titleMax),
});
export type HandbookLink = z.infer<typeof handbookLinkSchema>;

export const impactItemSchema = z.object({
  label: z.string().trim().min(1).max(SHOP_LIMITS.impactLabelMax),
  value: z.string().trim().min(1).max(SHOP_LIMITS.impactValueMax),
  unit: text(20).default(""),
  /** Required: no figure without a source (BR-09, BR-23). */
  source: z.string().trim().min(1).max(SHOP_LIMITS.impactSourceMax),
});
export type ImpactItem = z.infer<typeof impactItemSchema>;

/** `color:xanh-reu`: the option value an image belongs to. */
export const variantValueRefSchema = z
  .string()
  .regex(/^[a-z0-9-]+:[a-z0-9-]+$/)
  .max(SHOP_LIMITS.optionNameMax + SHOP_LIMITS.optionValueMax + 1);

export const productImageSchema = mediaImageSchema.extend({
  variantValues: z.array(variantValueRefSchema).max(SHOP_LIMITS.optionValuesMax),
});
export type ProductImage = z.infer<typeof productImageSchema>;

export const productImageInputSchema = z.object({
  mediaId: objectIdSchema,
  /** May be empty in a draft; publishing needs every alt (BR-20). */
  alt: text(MEDIA_LIMITS.altMax).default(""),
  variantValues: z.array(variantValueRefSchema).max(SHOP_LIMITS.optionValuesMax).default([]),
});
export type ProductImageInput = z.infer<typeof productImageInputSchema>;

export const variantInputSchema = z.object({
  /** Existing variant; absent for a new one. */
  id: objectIdSchema.optional(),
  sku: skuSchema,
  /** optionKey → valueKey, one entry per product option. */
  optionValues: z.record(optionKeySchema, optionKeySchema),
  price: priceSchema,
  /** The struck-through price; must be above `price` (shown as a sale). */
  compareAtPrice: priceSchema.nullable().default(null),
  lowStockThreshold: z.number().int().min(0).max(1_000).default(SHOP_LIMITS.lowStockDefault),
  weightGrams: z.number().int().min(0).max(100_000).nullable().default(null),
  active: z.boolean().default(true),
  /**
   * Handmade on demand: no stock to count, nothing held or taken off a shelf, never
   * sold out; the product's `leadTimeDays` says when it ships (20/11/2026).
   */
  madeToOrder: z.boolean().default(false),
  /** Only read for a new variant; later changes go through stock adjustments. */
  initialStock: z.number().int().min(0).max(SHOP_LIMITS.stockMax).default(0),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productSeoSchema = z.object({
  title: text(SHOP_LIMITS.seoTitleMax).default(""),
  description: text(SHOP_LIMITS.seoDescriptionMax).default(""),
});

const productShape = {
  slug: productSlugSchema,
  title: z.string().trim().min(1).max(SHOP_LIMITS.titleMax),
  summary: text(SHOP_LIMITS.summaryMax).default(""),
  categoryId: objectIdSchema,
  partnerBrandId: objectIdSchema.nullable().default(null),
  story: productStorySchema,
  handbookLink: handbookLinkSchema.nullable().default(null),
  materials: z
    .array(z.string().trim().min(1).max(SHOP_LIMITS.materialMax))
    .max(SHOP_LIMITS.materialsMax)
    .default([]),
  care: text(SHOP_LIMITS.careMax).default(""),
  dimensions: text(SHOP_LIMITS.dimensionsMax).default(""),
  /** Days to make a made-to-order piece; shown on the page, sets the order's due day. */
  leadTimeDays: z.number().int().min(1).max(90).nullable().default(null),
  options: z.array(productOptionSchema).max(SHOP_LIMITS.optionsMax).default([]),
  variants: z.array(variantInputSchema).min(1).max(SHOP_LIMITS.variantsMax),
  /** In display order; the first is the cover. */
  images: z.array(productImageInputSchema).max(SHOP_LIMITS.imagesMax).default([]),
  impactItems: z.array(impactItemSchema).max(SHOP_LIMITS.impactItemsMax).default([]),
  seo: productSeoSchema.default({ title: "", description: "" }),
  badges: z.array(productBadgeSchema).max(PRODUCT_BADGES.length).default([]),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
};

export const productCreateRequestSchema = z.object(productShape);
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;

export const productUpdateRequestSchema = z.object({ ...productShape, revision: revisionSchema });
export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;

export const productStatusRequestSchema = z.object({
  status: productStatusSchema,
  revision: revisionSchema,
});
export type ProductStatusRequest = z.infer<typeof productStatusRequestSchema>;

export const productRevisionRequestSchema = z.object({ revision: revisionSchema });
export type ProductRevisionRequest = z.infer<typeof productRevisionRequestSchema>;

export const stockAdjustRequestSchema = z.object({
  /** `add` receives or removes units (negative); `set` counts the shelf. */
  mode: z.enum(["add", "set"]),
  quantity: z.number().int().min(-SHOP_LIMITS.stockMax).max(SHOP_LIMITS.stockMax),
  reason: text(SHOP_LIMITS.reasonMax).default(""),
});
export type StockAdjustRequest = z.infer<typeof stockAdjustRequestSchema>;

// ---------------------------------------------------------------- admin views

export const variantStockSchema = z.object({
  onHand: z.number().int(),
  held: z.number().int(),
  sold: z.number().int(),
  available: z.number().int(),
});

export const productVariantSchema = z.object({
  id: objectIdSchema,
  sku: z.string(),
  optionValues: z.record(z.string(), z.string()),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  lowStockThreshold: z.number().int(),
  weightGrams: z.number().int().nullable(),
  active: z.boolean(),
  madeToOrder: z.boolean(),
  stock: variantStockSchema,
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSchema = z.object({
  id: objectIdSchema,
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  categoryId: objectIdSchema,
  partnerBrandId: objectIdSchema.nullable(),
  story: productStorySchema,
  handbookLink: handbookLinkSchema.nullable(),
  materials: z.array(z.string()),
  care: z.string(),
  dimensions: z.string(),
  leadTimeDays: z.number().int().nullable(),
  options: z.array(productOptionSchema),
  variants: z.array(productVariantSchema),
  images: z.array(productImageSchema),
  impact: z.object({
    items: z.array(impactItemSchema),
    status: impactStatusSchema,
    approvedAt: isoDateTimeSchema.nullable(),
  }),
  seo: z.object({ title: z.string(), description: z.string() }),
  badges: z.array(productBadgeSchema),
  sortOrder: z.number().int(),
  status: productStatusSchema,
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  publishBlockers: z.array(productPublishBlockerSchema),
  publishedAt: isoDateTimeSchema.nullable(),
  revision: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type ProductView = z.infer<typeof productSchema>;

export const productListItemSchema = z.object({
  id: objectIdSchema,
  slug: z.string(),
  title: z.string(),
  status: productStatusSchema,
  categoryId: objectIdSchema,
  partnerBrandId: objectIdSchema.nullable(),
  cover: mediaImageSchema.nullable(),
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  variantCount: z.number().int(),
  available: z.number().int(),
  lowStock: z.boolean(),
  publishBlockers: z.array(productPublishBlockerSchema),
  impactStatus: impactStatusSchema,
  updatedAt: isoDateTimeSchema,
});
export type ProductListItem = z.infer<typeof productListItemSchema>;

export const productListQuerySchema = cursorPageQuerySchema.extend({
  status: productStatusSchema.optional(),
  categoryId: objectIdSchema.optional(),
  partnerBrandId: objectIdSchema.optional(),
  stock: z.enum(["low", "out"]).optional(),
  q: z.string().trim().max(100).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productListSchema = cursorPageSchema(productListItemSchema);
export type ProductList = z.infer<typeof productListSchema>;

export const stockMovementSchema = z.object({
  id: objectIdSchema,
  type: stockMovementTypeSchema,
  delta: z.number().int(),
  reason: z.string(),
  orderId: objectIdSchema.nullable(),
  at: isoDateTimeSchema,
});
export const stockMovementListSchema = z.object({ items: z.array(stockMovementSchema) });
export type StockMovementView = z.infer<typeof stockMovementSchema>;

// ---------------------------------------------------------------- public views (web)

export const publicCategorySchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
});
export type PublicCategory = z.infer<typeof publicCategorySchema>;
export const publicCategoryListSchema = z.object({ items: z.array(publicCategorySchema) });

export const publicBrandRefSchema = z.object({ slug: z.string(), name: z.string() });

export const publicProductCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: publicCategorySchema.pick({ key: true, name: true }),
  brand: publicBrandRefSchema.nullable(),
  cover: mediaImageSchema.nullable(),
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  /** Highest struck-through price among variants on sale, for "Giảm giá". */
  compareAtMax: z.number().int().nullable(),
  badges: z.array(productBadgeSchema),
  availability: availabilitySchema,
});
export type PublicProductCard = z.infer<typeof publicProductCardSchema>;

export const PUBLIC_PRODUCT_SORTS = ["featured", "newest", "price_asc", "price_desc"] as const;
export const publicProductSortSchema = z.enum(PUBLIC_PRODUCT_SORTS);
export type PublicProductSort = z.infer<typeof publicProductSortSchema>;

export const publicProductListQuerySchema = cursorPageQuerySchema.extend({
  category: z.string().trim().max(SHOP_LIMITS.slugMax).optional(),
  brand: z.string().trim().max(SHOP_LIMITS.slugMax).optional(),
  q: z.string().trim().max(100).optional(),
  sort: publicProductSortSchema.default("featured"),
});
export type PublicProductListQuery = z.infer<typeof publicProductListQuerySchema>;

export const publicProductListSchema = cursorPageSchema(publicProductCardSchema);
export type PublicProductList = z.infer<typeof publicProductListSchema>;

export const publicVariantSchema = z.object({
  id: objectIdSchema,
  sku: z.string(),
  optionValues: z.record(z.string(), z.string()),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  availability: availabilitySchema,
  /** Only when `low`: "Còn 2". */
  left: z.number().int().nullable(),
});
export type PublicVariant = z.infer<typeof publicVariantSchema>;

export const publicProductSchema = publicProductCardSchema.extend({
  story: productStorySchema,
  handbookLink: handbookLinkSchema.nullable(),
  materials: z.array(z.string()),
  care: z.string(),
  dimensions: z.string(),
  /** Days to make a made-to-order variant; null when nothing is made to order. */
  leadTimeDays: z.number().int().nullable(),
  options: z.array(productOptionSchema),
  variants: z.array(publicVariantSchema),
  images: z.array(productImageSchema),
  /** Approved figures only (BR-23); empty otherwise. */
  impact: z.array(impactItemSchema),
  brandStory: z.string(),
  seo: z.object({ title: z.string(), description: z.string() }),
  rating: z.object({ average: z.number(), count: z.number().int() }).nullable(),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;
