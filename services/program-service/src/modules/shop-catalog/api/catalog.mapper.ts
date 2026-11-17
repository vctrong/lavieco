import type {
  PartnerBrand,
  ProductCategory,
  ProductListItem,
  ProductVariant,
  ProductView,
  PublicProduct,
  PublicProductCard,
  PublicVariant,
  ShopSettings,
  StockMovementView,
} from "@lavieco/shared/shop";

import type { PublicProductBundle } from "../application/catalog-public-service";
import type { ProductBundle } from "../application/product-admin-service";
import type {
  BrandRecord,
  CategoryRecord,
  ShopSettingsRecord,
  StockMovementRecord,
} from "../domain/catalog";
import {
  available,
  availabilityOf,
  productAvailability,
  publishBlockers,
  type ProductRecord,
  type VariantRecord,
} from "../domain/product";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export const toCategoryDto = (c: CategoryRecord): ProductCategory => ({
  id: c.id,
  key: c.key,
  name: c.name,
  description: c.description,
  sortOrder: c.sortOrder,
  archived: c.archivedAt !== null,
  revision: c.revision,
});

export const toBrandDto = (b: BrandRecord): PartnerBrand => ({ ...b });

export const toSettingsDto = (s: ShopSettingsRecord): ShopSettings => ({ ...s });

export function toVariantDto(v: VariantRecord): ProductVariant {
  return {
    id: v.id,
    sku: v.sku,
    optionValues: v.optionValues,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    lowStockThreshold: v.lowStockThreshold,
    weightGrams: v.weightGrams,
    active: v.status === "active",
    stock: { ...v.stock, available: available(v) },
  };
}

const cover = (product: ProductRecord) => {
  const image = product.images[0];
  return image
    ? {
        mediaId: image.mediaId,
        publicId: image.publicId,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }
    : null;
};

export function toProductDto({ product, variants }: ProductBundle): ProductView {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    summary: product.summary,
    categoryId: product.categoryId,
    partnerBrandId: product.partnerBrandId,
    story: product.story,
    handbookLink: product.handbookLink,
    materials: product.materials,
    care: product.care,
    dimensions: product.dimensions,
    options: product.options,
    variants: variants.filter((v) => v.status === "active").map(toVariantDto),
    images: product.images,
    impact: {
      items: product.impact.items,
      status: product.impact.status,
      approvedAt: iso(product.impact.approvedAt),
    },
    seo: product.seo,
    badges: product.badges,
    sortOrder: product.sortOrder,
    status: product.status,
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    publishBlockers: publishBlockers(product, variants),
    publishedAt: iso(product.publishedAt),
    revision: product.revision,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductListItemDto({ product, variants }: ProductBundle): ProductListItem {
  const active = variants.filter((v) => v.status === "active");
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    status: product.status,
    categoryId: product.categoryId,
    partnerBrandId: product.partnerBrandId,
    cover: cover(product),
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    variantCount: active.length,
    available: active.reduce((sum, v) => sum + available(v), 0),
    lowStock: active.some((v) => availabilityOf(v) !== "in_stock"),
    publishBlockers: publishBlockers(product, variants),
    impactStatus: product.impact.status,
    updatedAt: product.updatedAt.toISOString(),
  };
}

export const toMovementDto = (m: StockMovementRecord): StockMovementView => ({
  id: m.id,
  type: m.type,
  delta: m.delta,
  reason: m.reason,
  orderId: m.orderId,
  at: m.at.toISOString(),
});

function toPublicVariant(v: VariantRecord): PublicVariant {
  const availability = availabilityOf(v);
  return {
    id: v.id,
    sku: v.sku,
    optionValues: v.optionValues,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    availability,
    left: availability === "low" ? available(v) : null,
  };
}

export function toPublicCardDto({
  product,
  variants,
  category,
  brand,
}: PublicProductBundle): PublicProductCard {
  const onSale = variants.map((v) => v.compareAtPrice).filter((p): p is number => p !== null);
  return {
    slug: product.slug,
    title: product.title,
    summary: product.summary,
    category: { key: category.key, name: category.name },
    brand: brand ? { slug: brand.slug, name: brand.name } : null,
    cover: cover(product),
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    compareAtMax: onSale.length > 0 ? Math.max(...onSale) : null,
    badges: product.badges,
    availability: productAvailability(variants),
  };
}

/** No draft, review, commission or raw stock fields leave the service (S3, BR-23, BR-25). */
export function toPublicProductDto(bundle: PublicProductBundle): PublicProduct {
  const { product, variants, brand } = bundle;
  return {
    ...toPublicCardDto(bundle),
    story: product.story,
    handbookLink: product.handbookLink,
    materials: product.materials,
    care: product.care,
    dimensions: product.dimensions,
    options: product.options,
    variants: variants.map(toPublicVariant),
    images: product.images,
    impact: product.impact.status === "approved" ? product.impact.items : [],
    brandStory: brand?.story ?? "",
    seo: product.seo,
    rating: null,
  };
}
