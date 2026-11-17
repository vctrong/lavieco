import { DomainError, toSearchKey, toSlug } from "@lavieco/shared";
import type {
  Availability,
  HandbookLink,
  ImpactItem,
  ImpactStatus,
  ProductBadge,
  ProductCreateRequest,
  ProductOption,
  ProductPublishBlocker,
  ProductStatus,
  ProductStory,
  VariantInput,
} from "@lavieco/shared/shop";

/** One image as stored on the product: the media snapshot, its alt and its option values. */
export type ProductImageRecord = {
  mediaId: string;
  publicId: string;
  width: number;
  height: number;
  alt: string;
  variantValues: string[];
};

export type ProductRecord = {
  id: string;
  slug: string;
  slugHistory: string[];
  title: string;
  summary: string;
  categoryId: string;
  partnerBrandId: string | null;
  story: ProductStory;
  handbookLink: HandbookLink | null;
  materials: string[];
  care: string;
  dimensions: string;
  options: ProductOption[];
  images: ProductImageRecord[];
  impact: {
    items: ImpactItem[];
    status: ImpactStatus;
    approvedBy: string | null;
    approvedAt: Date | null;
  };
  seo: { title: string; description: string };
  badges: ProductBadge[];
  sortOrder: number;
  status: ProductStatus;
  priceMin: number;
  priceMax: number;
  publishedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export type VariantRecord = {
  id: string;
  productId: string;
  sku: string;
  optionKey: string;
  optionValues: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  lowStockThreshold: number;
  weightGrams: number | null;
  status: "active" | "archived";
  sortOrder: number;
  stock: { onHand: number; held: number; sold: number };
  createdAt: Date;
  updatedAt: Date;
};

/** What a product editor saves, apart from images (resolved against content-service first). */
export type ProductChanges = Omit<
  ProductRecord,
  | "id"
  | "images"
  | "status"
  | "publishedAt"
  | "revision"
  | "createdAt"
  | "updatedAt"
  | "slugHistory"
  | "impact"
  | "priceMin"
  | "priceMax"
> & { impactItems: ImpactItem[]; searchKey: string };

export const available = (variant: Pick<VariantRecord, "stock">) =>
  Math.max(0, variant.stock.onHand - variant.stock.held);

/** "Còn N" once the available stock is at or below the variant's threshold. */
export function availabilityOf(
  variant: Pick<VariantRecord, "stock" | "lowStockThreshold" | "status">,
): Availability {
  const left = variant.status === "active" ? available(variant) : 0;
  if (left === 0) return "out";
  return left <= variant.lowStockThreshold ? "low" : "in_stock";
}

/** Best availability among a product's variants, for its card. */
export function productAvailability(variants: readonly VariantRecord[]): Availability {
  const states = variants.map(availabilityOf);
  if (states.includes("in_stock")) return "in_stock";
  return states.includes("low") ? "low" : "out";
}

/** Canonical key of a variant's option values, in option order: `color=xanh-reu|scent=que`. */
export function optionKeyOf(options: readonly ProductOption[], values: Record<string, string>) {
  return (
    options.map((option) => `${option.key}=${values[option.key] ?? ""}`).join("|") || "default"
  );
}

/**
 * Variants must cover the product's options exactly: one known value per option, no
 * extra keys, no two variants with the same combination, SKUs unique within the product.
 */
export function assertVariants(
  options: readonly ProductOption[],
  variants: readonly VariantInput[],
) {
  const keys = new Set<string>();
  const skus = new Set<string>();
  for (const variant of variants) {
    const given = Object.keys(variant.optionValues);
    if (given.length !== options.length) throw new DomainError("product.variants_invalid");
    for (const option of options) {
      const value = variant.optionValues[option.key];
      if (!value || !option.values.some((known) => known.key === value)) {
        throw new DomainError("product.variants_invalid");
      }
    }
    const key = optionKeyOf(options, variant.optionValues);
    if (keys.has(key) || skus.has(variant.sku)) throw new DomainError("product.variants_invalid");
    keys.add(key);
    skus.add(variant.sku);
    if (variant.compareAtPrice !== null && variant.compareAtPrice <= variant.price) {
      throw new DomainError("product.price_invalid");
    }
  }
  const optionKeys = new Set(options.map((option) => option.key));
  if (optionKeys.size !== options.length) throw new DomainError("product.variants_invalid");
  for (const option of options) {
    if (new Set(option.values.map((value) => value.key)).size !== option.values.length) {
      throw new DomainError("product.variants_invalid");
    }
  }
}

/** Image option values must name an existing option value; media ids appear once. */
export function assertImages(
  options: readonly ProductOption[],
  images: readonly { mediaId: string; variantValues: readonly string[] }[],
) {
  if (new Set(images.map((image) => image.mediaId)).size !== images.length) {
    throw new DomainError("product.images_invalid");
  }
  const known = new Set(
    options.flatMap((option) => option.values.map((value) => `${option.key}:${value.key}`)),
  );
  for (const image of images) {
    if (image.variantValues.some((value) => !known.has(value))) {
      throw new DomainError("product.images_invalid");
    }
  }
}

export function toProductChanges(input: ProductCreateRequest): ProductChanges {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    categoryId: input.categoryId,
    partnerBrandId: input.partnerBrandId,
    story: input.story,
    handbookLink: input.handbookLink,
    materials: input.materials,
    care: input.care,
    dimensions: input.dimensions,
    options: input.options,
    impactItems: input.impactItems,
    seo: input.seo,
    badges: [...new Set(input.badges)],
    sortOrder: input.sortOrder,
    searchKey: toSearchKey([input.title, input.summary, ...input.materials].join(" ")),
  };
}

/** BR-23: new or changed figures wait for approval again; no figures, nothing to approve. */
export function nextImpact(
  current: ProductRecord["impact"] | null,
  items: readonly ImpactItem[],
): ProductRecord["impact"] {
  if (items.length === 0) return { items: [], status: "none", approvedBy: null, approvedAt: null };
  const same = current !== null && JSON.stringify(current.items) === JSON.stringify(items);
  if (same && current.status === "approved") return current;
  return { items: [...items], status: "pending", approvedBy: null, approvedAt: null };
}

/** BR-20: what a product still lacks before it can be published. */
export function publishBlockers(
  product: Pick<ProductRecord, "images" | "story" | "handbookLink">,
  variants: readonly Pick<VariantRecord, "status">[],
): ProductPublishBlocker[] {
  const blockers: ProductPublishBlocker[] = [];
  if (product.images.length === 0) blockers.push("no_image");
  else if (product.images.some((image) => image.alt.trim() === ""))
    blockers.push("image_alt_missing");
  const { message, story, lesson } = product.story;
  if (!message.trim() || !story.trim() || !lesson.trim()) blockers.push("story_incomplete");
  if (!product.handbookLink) blockers.push("handbook_missing");
  if (!variants.some((variant) => variant.status === "active")) blockers.push("no_active_variant");
  return blockers;
}

/** Live (on the public site) only when published. */
export const isLive = (status: ProductStatus) => status === "published";

export function priceRange(variants: readonly Pick<VariantRecord, "price" | "status">[]) {
  const prices = variants.filter((variant) => variant.status === "active").map((v) => v.price);
  if (prices.length === 0) return { priceMin: 0, priceMax: 0 };
  return { priceMin: Math.min(...prices), priceMax: Math.max(...prices) };
}

/** Option and value keys are derived from their labels and stay stable once saved. */
export const keyOf = (label: string) => toSlug(label, 40) || "x";
