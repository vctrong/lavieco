"use server";

import type { z } from "zod";

import { objectIdSchema } from "@lavieco/shared";
import {
  partnerBrandUpsertRequestSchema,
  productCategoryCreateRequestSchema,
  productCategoryUpdateRequestSchema,
  productCreateRequestSchema,
  productStatusRequestSchema,
  productUpdateRequestSchema,
  shopSettingsUpdateRequestSchema,
  stockAdjustRequestSchema,
  type PartnerBrand,
  type ProductCategory,
  type ProductVariant,
  type ProductView,
  type ShopSettings,
} from "@lavieco/shared/shop";

import { programClient } from "@/lib/services";

import { TEXT } from "../constants/text";
import { callShop } from "../server/shop";
import type { ShopActionResult } from "../types";

function fieldErrors(error: z.ZodError): ShopActionResult<never> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    // Never the schema's English text: one Vietnamese sentence per field.
    errors[issue.path.join(".")] ??= TEXT.vi.errors.invalid;
  }
  return { status: "invalid", fieldErrors: errors };
}

const notFound = { status: "error", reason: "not_found" } as const;

export async function createProduct(input: unknown): Promise<ShopActionResult<ProductView>> {
  const parsed = productCreateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.product.create", (token, id) =>
    programClient().createProduct(token, parsed.data, id),
  );
}

export async function updateProduct(
  productId: unknown,
  input: unknown,
): Promise<ShopActionResult<ProductView>> {
  const id = objectIdSchema.safeParse(productId);
  if (!id.success) return notFound;
  const parsed = productUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.product.update", (token, requestId) =>
    programClient().updateProduct(token, id.data, parsed.data, requestId),
  );
}

export async function setProductStatus(
  productId: unknown,
  input: unknown,
): Promise<ShopActionResult<ProductView>> {
  const id = objectIdSchema.safeParse(productId);
  if (!id.success) return notFound;
  const parsed = productStatusRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.product.status", (token, requestId) =>
    programClient().setProductStatus(token, id.data, parsed.data, requestId),
  );
}

export async function approveProductImpact(
  productId: unknown,
  revision: unknown,
): Promise<ShopActionResult<ProductView>> {
  const id = objectIdSchema.safeParse(productId);
  if (!id.success || typeof revision !== "number") return notFound;
  return callShop("shop.product.impact", (token, requestId) =>
    programClient().approveProductImpact(token, id.data, revision, requestId),
  );
}

export async function adjustStock(
  variantId: unknown,
  input: unknown,
): Promise<ShopActionResult<ProductVariant>> {
  const id = objectIdSchema.safeParse(variantId);
  if (!id.success) return notFound;
  const parsed = stockAdjustRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.stock.adjust", (token, requestId) =>
    programClient().adjustStock(token, id.data, parsed.data, requestId),
  );
}

export async function createCategory(input: unknown): Promise<ShopActionResult<ProductCategory>> {
  const parsed = productCategoryCreateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.category.create", (token, id) =>
    programClient().createProductCategory(token, parsed.data, id),
  );
}

export async function updateCategory(
  categoryId: unknown,
  input: unknown,
): Promise<ShopActionResult<ProductCategory>> {
  const id = objectIdSchema.safeParse(categoryId);
  if (!id.success) return notFound;
  const parsed = productCategoryUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.category.update", (token, requestId) =>
    programClient().updateProductCategory(token, id.data, parsed.data, requestId),
  );
}

export async function saveBrand(
  brandId: unknown,
  input: unknown,
): Promise<ShopActionResult<PartnerBrand>> {
  const id = brandId === null ? null : objectIdSchema.safeParse(brandId);
  if (id !== null && !id.success) return notFound;
  const parsed = partnerBrandUpsertRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.brand.save", (token, requestId) =>
    programClient().savePartnerBrand(token, id?.data ?? null, parsed.data, requestId),
  );
}

export async function saveShopSettings(input: unknown): Promise<ShopActionResult<ShopSettings>> {
  const parsed = shopSettingsUpdateRequestSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  return callShop("shop.settings.save", (token, id) =>
    programClient().saveShopSettings(token, parsed.data, id),
  );
}
