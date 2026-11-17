import { CART_LIMITS, type Cart, type CartLine } from "@lavieco/shared/shop";

import { available, type ProductRecord, type VariantRecord } from "../../shop-catalog";

export type CartItem = { variantId: string; quantity: number; addedAt: Date };

export type CartRecord = {
  id: string;
  tokenHash: string;
  userId: string | null;
  items: CartItem[];
};

/** Label of a variant's option values, in option order: `Xanh rêu · Nhỏ`. */
export function optionLabel(product: ProductRecord, variant: VariantRecord) {
  return product.options
    .map((option) => option.values.find((v) => v.key === variant.optionValues[option.key])?.label)
    .filter(Boolean)
    .join(" · ");
}

/** The image a variant shows: one tagged with its option values, else the cover. */
export function variantImage(product: ProductRecord, variant: VariantRecord) {
  const tags = Object.entries(variant.optionValues).map(([k, v]) => `${k}:${v}`);
  const image =
    product.images.find((i) => i.variantValues.some((value) => tags.includes(value))) ??
    product.images[0];
  return image
    ? {
        mediaId: image.mediaId,
        publicId: image.publicId,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }
    : null;
}

/**
 * Prices the cart from the catalogue as it is now (BR-21): a product no longer published,
 * an archived variant or nothing left in stock is `unavailable`; a quantity above what is
 * left is shown `reduced`. The stored quantities stay as the person chose them.
 */
export function priceCart(
  items: readonly CartItem[],
  variants: ReadonlyMap<string, VariantRecord>,
  products: ReadonlyMap<string, ProductRecord>,
): Cart {
  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = variants.get(item.variantId);
    const product = variant ? products.get(variant.productId) : undefined;
    if (!variant || !product) continue;
    const sellable = product.status === "published" && variant.status === "active";
    const maxQuantity = sellable ? Math.min(available(variant), CART_LIMITS.perLine) : 0;
    const quantity = Math.min(item.quantity, maxQuantity);
    lines.push({
      variantId: variant.id,
      productSlug: product.slug,
      title: product.title,
      optionLabel: optionLabel(product, variant),
      sku: variant.sku,
      image: variantImage(product, variant),
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity,
      maxQuantity,
      lineTotal: quantity * variant.price,
      issue: maxQuantity === 0 ? "unavailable" : quantity < item.quantity ? "reduced" : null,
    });
  }
  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}

/** Adds the guest's lines to the member's, keeping the larger quantity of a shared line. */
export function mergeItems(into: readonly CartItem[], from: readonly CartItem[]): CartItem[] {
  const merged = new Map(into.map((item) => [item.variantId, { ...item }]));
  for (const item of from) {
    const existing = merged.get(item.variantId);
    if (existing)
      existing.quantity = Math.min(CART_LIMITS.perLine, Math.max(existing.quantity, item.quantity));
    else merged.set(item.variantId, { ...item });
  }
  return [...merged.values()].slice(0, CART_LIMITS.lines);
}
