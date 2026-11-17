/**
 * Bounds of the shop (docs/08 §4, docs/03 §9.3): every embedded array is capped, and the
 * admin forms check the very same numbers before sending.
 */
export const SHOP_LIMITS = {
  slugMax: 80,
  skuMax: 40,
  titleMax: 120,
  summaryMax: 300,
  storyPartMax: 2_000,
  materialsMax: 10,
  materialMax: 80,
  careMax: 1_000,
  dimensionsMax: 200,
  optionsMax: 3,
  optionNameMax: 40,
  optionValuesMax: 20,
  optionValueMax: 40,
  variantsMax: 60,
  imagesMax: 10,
  impactItemsMax: 6,
  impactLabelMax: 80,
  impactValueMax: 40,
  impactSourceMax: 300,
  seoTitleMax: 60,
  seoDescriptionMax: 160,
  priceMax: 100_000_000,
  stockMax: 1_000_000,
  categoryNameMax: 80,
  categoryDescriptionMax: 300,
  brandNameMax: 120,
  brandStoryMax: 2_000,
  /** Commission in per mille (‰): 150 = 15 %. */
  commissionMax: 1_000,
  reasonMax: 300,
  /** A visitor sees "Còn N" once the available stock is at or below this. */
  lowStockDefault: 3,
} as const;

/** Next.js cache tags of public shop data, revalidated by program-service through the outbox. */
export const SHOP_CACHE_TAGS = {
  products: "shop:products",
  product: (slug: string) => `shop:products:${slug}`,
  categories: "shop:categories",
} as const;
