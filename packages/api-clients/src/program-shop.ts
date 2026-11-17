import {
  importJobSchema,
  type ImportImagesRequest,
  type ImportMode,
  type ImportRemovedImagesRequest,
  partnerBrandListSchema,
  partnerBrandSchema,
  productCategoryListSchema,
  productCategorySchema,
  productListSchema,
  productSchema,
  productVariantSchema,
  publicCategoryListSchema,
  publicProductListSchema,
  publicProductSchema,
  publicShopSettingsSchema,
  shopSettingsSchema,
  stockMovementListSchema,
  type PartnerBrandUpsertRequest,
  type ProductCategoryCreateRequest,
  type ProductCategoryUpdateRequest,
  type ProductCreateRequest,
  type ProductListQuery,
  type ProductStatusRequest,
  type ProductUpdateRequest,
  type PublicProductListQuery,
  type ShopSettingsUpdateRequest,
  type StockAdjustRequest,
} from "@lavieco/shared/shop";

import type { createHttpClient } from "./http-client";

const V1 = "/internal/v1/shop";

type Http = ReturnType<typeof createHttpClient>;
type UserAuth = { kind: "user"; accessToken: string };

type QueryValue = string | number | boolean | undefined;

function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const segment = (value: string) => encodeURIComponent(value);

/**
 * Shop calls of program-service (ADR-0028), spread into the program client. Admin calls
 * carry the staff token; public calls (`/bo-suu-tap`) carry the `web` service token.
 */
export function shopMethods(http: Http) {
  const service = { kind: "service" } as const;
  const user = (accessToken: string): UserAuth => ({ kind: "user", accessToken });

  return {
    // --- admin: products ---
    listProducts: (accessToken: string, query: Partial<ProductListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/products${queryString(query)}`,
        auth: user(accessToken),
        schema: productListSchema,
        requestId,
      }),
    getProduct: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/products/${segment(id)}`,
        auth: user(accessToken),
        schema: productSchema,
        requestId,
      }),
    createProduct: (accessToken: string, body: ProductCreateRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/products`,
        auth: user(accessToken),
        body,
        schema: productSchema,
        requestId,
      }),
    updateProduct: (
      accessToken: string,
      id: string,
      body: ProductUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/products/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: productSchema,
        requestId,
      }),
    setProductStatus: (
      accessToken: string,
      id: string,
      body: ProductStatusRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/products/${segment(id)}/status`,
        auth: user(accessToken),
        body,
        schema: productSchema,
        requestId,
      }),
    approveProductImpact: (accessToken: string, id: string, revision: number, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/products/${segment(id)}/impact/approve`,
        auth: user(accessToken),
        body: { revision },
        schema: productSchema,
        requestId,
      }),
    adjustStock: (
      accessToken: string,
      variantId: string,
      body: StockAdjustRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/variants/${segment(variantId)}/stock-adjustments`,
        auth: user(accessToken),
        body,
        schema: productVariantSchema,
        requestId,
      }),
    listStockMovements: (accessToken: string, variantId: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/variants/${segment(variantId)}/stock-movements`,
        auth: user(accessToken),
        schema: stockMovementListSchema,
        requestId,
      }),

    // --- admin: categories, brands, settings ---
    listProductCategories: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/categories`,
        auth: user(accessToken),
        schema: productCategoryListSchema,
        requestId,
      }),
    createProductCategory: (
      accessToken: string,
      body: ProductCategoryCreateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/categories`,
        auth: user(accessToken),
        body,
        schema: productCategorySchema,
        requestId,
      }),
    updateProductCategory: (
      accessToken: string,
      id: string,
      body: ProductCategoryUpdateRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/categories/${segment(id)}`,
        auth: user(accessToken),
        body,
        schema: productCategorySchema,
        requestId,
      }),
    listPartnerBrands: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/brands`,
        auth: user(accessToken),
        schema: partnerBrandListSchema,
        requestId,
      }),
    savePartnerBrand: (
      accessToken: string,
      id: string | null,
      body: PartnerBrandUpsertRequest,
      requestId?: string,
    ) =>
      http.call({
        method: id ? "PUT" : "POST",
        path: id ? `${V1}/brands/${segment(id)}` : `${V1}/brands`,
        auth: user(accessToken),
        body,
        schema: partnerBrandSchema,
        requestId,
      }),
    getShopSettings: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/settings`,
        auth: user(accessToken),
        schema: shopSettingsSchema,
        requestId,
      }),
    saveShopSettings: (accessToken: string, body: ShopSettingsUpdateRequest, requestId?: string) =>
      http.call({
        method: "PUT",
        path: `${V1}/settings`,
        auth: user(accessToken),
        body,
        schema: shopSettingsSchema,
        requestId,
      }),

    // --- admin: bulk import / export (UC-39) ---
    downloadImportTemplate: (accessToken: string, requestId?: string) =>
      http.download({
        path: `${V1}/import/template`,
        auth: user(accessToken),
        timeoutMs: 30_000,
        requestId,
      }),
    exportProducts: (accessToken: string, requestId?: string) =>
      http.download({
        path: `${V1}/products/export`,
        auth: user(accessToken),
        timeoutMs: 60_000,
        requestId,
      }),
    uploadImport: (
      accessToken: string,
      file: { bytes: Blob; filename: string },
      mode: ImportMode,
      requestId?: string,
    ) => {
      const form = new FormData();
      form.set("mode", mode);
      form.set("file", file.bytes, file.filename);
      return http.call({
        method: "POST",
        path: `${V1}/import-jobs`,
        auth: user(accessToken),
        form,
        schema: importJobSchema,
        timeoutMs: 60_000,
        requestId,
      });
    },
    getImportJob: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/import-jobs/${segment(id)}`,
        auth: user(accessToken),
        schema: importJobSchema,
        requestId,
      }),
    updateImportRow: (
      accessToken: string,
      id: string,
      row: number,
      raw: Record<string, string>,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/import-jobs/${segment(id)}/rows/${row}`,
        auth: user(accessToken),
        body: { raw },
        schema: importJobSchema,
        timeoutMs: 30_000,
        requestId,
      }),
    skipImportRow: (
      accessToken: string,
      id: string,
      row: number,
      skipped: boolean,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/import-jobs/${segment(id)}/rows/${row}/skip`,
        auth: user(accessToken),
        body: { skipped },
        schema: importJobSchema,
        timeoutMs: 30_000,
        requestId,
      }),
    addImportImages: (
      accessToken: string,
      id: string,
      body: ImportImagesRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/import-jobs/${segment(id)}/images`,
        auth: user(accessToken),
        body,
        schema: importJobSchema,
        timeoutMs: 30_000,
        requestId,
      }),
    setImportRemovedImages: (
      accessToken: string,
      id: string,
      body: ImportRemovedImagesRequest,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/import-jobs/${segment(id)}/removed-images`,
        auth: user(accessToken),
        body,
        schema: importJobSchema,
        requestId,
      }),
    commitImport: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/import-jobs/${segment(id)}/commit`,
        auth: user(accessToken),
        schema: importJobSchema,
        timeoutMs: 120_000,
        requestId,
      }),
    cancelImport: (accessToken: string, id: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/import-jobs/${segment(id)}/cancel`,
        auth: user(accessToken),
        schema: importJobSchema,
        requestId,
      }),

    // --- web: /bo-suu-tap (published only) ---
    listPublicCategories: (requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public/categories`,
        auth: service,
        schema: publicCategoryListSchema,
        requestId,
      }),
    listPublicProducts: (query: Partial<PublicProductListQuery>, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public/products${queryString(query)}`,
        auth: service,
        schema: publicProductListSchema,
        requestId,
      }),
    getPublicProduct: (slug: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public/products/${segment(slug)}`,
        auth: service,
        schema: publicProductSchema,
        requestId,
      }),
    getPublicShopSettings: (requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/public/settings`,
        auth: service,
        schema: publicShopSettingsSchema,
        requestId,
      }),
  };
}
