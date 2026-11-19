import { toSlug } from "@lavieco/shared";
import {
  SHOP_LIMITS,
  type ProductBadge,
  type ProductCreateRequest,
  type ProductOption,
  type ProductView,
} from "@lavieco/shared/shop";

import type { ProductImageValue } from "../types";

export type OptionValues = { name: string; valuesText: string };

export type VariantValues = {
  id?: string;
  sku: string;
  /** optionKey → valueKey */
  optionValues: Record<string, string>;
  price: string;
  compareAtPrice: string;
  lowStockThreshold: string;
  initialStock: string;
  active: boolean;
  /** Handmade on demand: no stock field. */
  madeToOrder: boolean;
};

export type ImpactValues = { label: string; value: string; unit: string; source: string };

/** What the product editor holds; strings for number inputs so typing stays free. */
export type ProductFormValues = {
  title: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  categoryId: string;
  partnerBrandId: string;
  materialsText: string;
  care: string;
  dimensions: string;
  /** Days to make a made-to-order piece. */
  leadTimeDays: string;
  badges: ProductBadge[];
  sortOrder: string;
  message: string;
  story: string;
  lesson: string;
  handbookSlug: string;
  handbookTitle: string;
  options: OptionValues[];
  variants: VariantValues[];
  images: ProductImageValue[];
  impactItems: ImpactValues[];
  seoTitle: string;
  seoDescription: string;
};

export const keyOf = (label: string) => toSlug(label, SHOP_LIMITS.optionValueMax) || "x";

/** Options as the API wants them: keys derived from labels, duplicates dropped. */
export function toOptions(options: readonly OptionValues[]): ProductOption[] {
  return options
    .filter((option) => option.name.trim())
    .map((option) => {
      const seen = new Set<string>();
      const values = option.valuesText
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean)
        .flatMap((label) => {
          const key = keyOf(label);
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ key, label }];
        });
      return { key: keyOf(option.name), name: option.name.trim(), values };
    });
}

const int = (text: string) =>
  text.trim() === "" ? Number.NaN : Number(text.replace(/[.\s]/g, ""));

export function emptyVariant(optionValues: Record<string, string> = {}): VariantValues {
  return {
    sku: "",
    optionValues,
    price: "",
    compareAtPrice: "",
    lowStockThreshold: String(SHOP_LIMITS.lowStockDefault),
    initialStock: "0",
    active: true,
    madeToOrder: false,
  };
}

/**
 * Every combination of the option values, keeping the variants that already exist for a
 * combination (their SKU, price, stock) and starting the others empty.
 */
export function generateVariants(
  options: readonly ProductOption[],
  current: readonly VariantValues[],
): VariantValues[] {
  let combos: Record<string, string>[] = [{}];
  for (const option of options) {
    combos = combos.flatMap((combo) =>
      option.values.map((v) => ({ ...combo, [option.key]: v.key })),
    );
  }
  const same = (a: Record<string, string>, b: Record<string, string>) =>
    options.every((o) => a[o.key] === b[o.key]);
  return combos.map(
    (combo) => current.find((v) => same(v.optionValues, combo)) ?? emptyVariant(combo),
  );
}

export function toProductRequest(values: ProductFormValues): ProductCreateRequest {
  return {
    slug: values.slug.trim(),
    title: values.title.trim(),
    summary: values.summary.trim(),
    categoryId: values.categoryId,
    partnerBrandId: values.partnerBrandId || null,
    story: {
      message: values.message.trim(),
      story: values.story.trim(),
      lesson: values.lesson.trim(),
    },
    handbookLink:
      values.handbookSlug.trim() && values.handbookTitle.trim()
        ? { slug: values.handbookSlug.trim(), title: values.handbookTitle.trim() }
        : null,
    materials: values.materialsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    care: values.care.trim(),
    dimensions: values.dimensions.trim(),
    leadTimeDays: values.leadTimeDays.trim() ? int(values.leadTimeDays) : null,
    options: toOptions(values.options),
    variants: values.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku.trim().toUpperCase(),
      optionValues: variant.optionValues,
      price: int(variant.price),
      compareAtPrice: variant.compareAtPrice.trim() ? int(variant.compareAtPrice) : null,
      lowStockThreshold: int(variant.lowStockThreshold || "0"),
      weightGrams: null,
      active: variant.active,
      madeToOrder: variant.madeToOrder,
      initialStock: variant.id || variant.madeToOrder ? 0 : int(variant.initialStock || "0"),
    })),
    images: values.images.map((image) => ({
      mediaId: image.mediaId,
      alt: image.alt.trim(),
      variantValues: image.variantValues,
    })),
    impactItems: values.impactItems
      .filter((item) => item.label.trim() || item.value.trim())
      .map((item) => ({
        label: item.label.trim(),
        value: item.value.trim(),
        unit: item.unit.trim(),
        source: item.source.trim(),
      })),
    seo: { title: values.seoTitle.trim(), description: values.seoDescription.trim() },
    badges: values.badges,
    sortOrder: int(values.sortOrder || "0"),
  };
}

export function emptyProductValues(categoryId: string): ProductFormValues {
  return {
    title: "",
    slug: "",
    slugTouched: false,
    summary: "",
    categoryId,
    partnerBrandId: "",
    materialsText: "",
    care: "",
    dimensions: "",
    leadTimeDays: "",
    badges: [],
    sortOrder: "0",
    message: "",
    story: "",
    lesson: "",
    handbookSlug: "",
    handbookTitle: "",
    options: [],
    variants: [emptyVariant()],
    images: [],
    impactItems: [],
    seoTitle: "",
    seoDescription: "",
  };
}

export function productToValues(product: ProductView): ProductFormValues {
  return {
    title: product.title,
    slug: product.slug,
    slugTouched: true,
    summary: product.summary,
    categoryId: product.categoryId,
    partnerBrandId: product.partnerBrandId ?? "",
    materialsText: product.materials.join("\n"),
    care: product.care,
    dimensions: product.dimensions,
    leadTimeDays: product.leadTimeDays === null ? "" : String(product.leadTimeDays),
    badges: product.badges,
    sortOrder: String(product.sortOrder),
    message: product.story.message,
    story: product.story.story,
    lesson: product.story.lesson,
    handbookSlug: product.handbookLink?.slug ?? "",
    handbookTitle: product.handbookLink?.title ?? "",
    options: product.options.map((option) => ({
      name: option.name,
      valuesText: option.values.map((v) => v.label).join(", "),
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      optionValues: variant.optionValues,
      price: String(variant.price),
      compareAtPrice: variant.compareAtPrice === null ? "" : String(variant.compareAtPrice),
      lowStockThreshold: String(variant.lowStockThreshold),
      initialStock: "0",
      active: variant.active,
      madeToOrder: variant.madeToOrder,
    })),
    images: product.images.map((image) => ({ ...image })),
    impactItems: product.impact.items.map((item) => ({ ...item })),
    seoTitle: product.seo.title,
    seoDescription: product.seo.description,
  };
}

/** `variants.0.sku` → DOM id of its input, so a submit with errors can focus it. */
export const fieldId = (path: string) => `product-${path.replace(/\./g, "-")}`;
