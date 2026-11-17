import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import { MEDIA_LIMITS, checkImageFile, type Media } from "@lavieco/shared/media";
import type { ProductListQuery } from "@lavieco/shared/shop";

import { failureKind, refOf } from "@/lib/action-errors";
import { requestId } from "@/lib/request-meta";
import { adminLogger, contentClient, programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";
import { withStaffToken } from "@/lib/staff-token";

import type { ShopActionResult, ShopFailure, UploadFailure, UploadResult } from "../types";

/** Reads for Server Components: an expired token goes through the refresh route. */
async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refresh : "/login");
    }
    if (isServiceProblem(error) && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}

export function loadProducts(query: Partial<ProductListQuery>) {
  return read("/shop/products", (token, id) =>
    programClient().listProducts(token, { limit: 20, ...query }, id),
  );
}

export function loadProduct(productId: string) {
  if (!/^[0-9a-f]{24}$/.test(productId)) notFound();
  return read(`/shop/products/${productId}`, (token, id) =>
    programClient().getProduct(token, productId, id),
  );
}

/** Categories and brands to pick from in the editor and the list filters. */
export function loadCatalogChoices(path: string) {
  return read(path, async (token, id) => {
    const [categories, brands] = await Promise.all([
      programClient().listProductCategories(token, id),
      programClient().listPartnerBrands(token, id),
    ]);
    return { categories: categories.items, brands: brands.items };
  });
}

export function loadShopSettings() {
  return read("/shop/settings", (token, id) => programClient().getShopSettings(token, id));
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, ShopFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "product.slug_taken": "slug_taken",
  "product.sku_taken": "sku_taken",
  "product.publish_blocked": "publish_blocked",
  "product.variants_invalid": "variants_invalid",
  "product.images_invalid": "images_invalid",
  "product.price_invalid": "price_invalid",
  "product.category_unknown": "category_unknown",
  "product.stock_below_held": "stock_below_held",
  "media.unavailable": "media_unavailable",
  "category.name_taken": "name_taken",
  "brand.slug_taken": "name_taken",
  "import.file_invalid": "file_invalid",
  "import.has_errors": "has_errors",
  "import.locked": "conflict",
};

/** Runs a write with the staff token; program-service checks `product:*` itself. */
export async function callShop<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<ShopActionResult<T>> {
  const id = await requestId();
  try {
    const call = await withStaffToken(id, (token) => run(token, id));
    if (call.session === "expired") return { status: "error", reason: "session_expired" };
    return { status: "ok", data: call.value };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) return { status: "error", reason };
    }
    adminLogger().warn("shop action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}

// ------------------------------------------------------------ product image upload

const MAX_REQUEST_BYTES = MEDIA_LIMITS.maxBytes.product_image + 64 * 1024;

const UPLOAD_FAILURE_BY_CODE: Partial<Record<ErrorCode, UploadFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "media.type_unsupported": "type_unsupported",
  "media.format_refused": "format_refused",
  "media.too_large": "too_large",
  "media.image_invalid": "image_invalid",
  "media.too_many_pixels": "too_many_pixels",
};

const fail = (reason: UploadFailure, format?: string): UploadResult => ({
  status: "error",
  reason,
  ...(format ? { format } : {}),
});

/** `POST /api/media/product-images` (Route Handler: Server Actions cap bodies at 1 MB). */
export async function handleProductImageUpload(request: Request): Promise<Response> {
  const result = await uploadProductImage(request);
  const status = result.status === "ok" ? 201 : result.reason === "session_expired" ? 401 : 400;
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}

/**
 * BFF of the product image picker (ADR-0020): the browser never talks to content-service
 * or Cloudinary. Same early check as the service, then forwarded with the staff token.
 */
async function uploadProductImage(request: Request): Promise<UploadResult> {
  const { accessToken, refreshToken } = await readStaffSession();
  if (!accessToken && !refreshToken) return fail("session_expired");
  if (Number(request.headers.get("content-length") ?? "0") > MAX_REQUEST_BYTES) {
    return fail("too_large");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("type_unsupported");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("type_unsupported");
  const issue = checkImageFile(file, "product_image");
  if (issue) return fail(issue.code, issue.code === "format_refused" ? issue.format : undefined);

  try {
    const id = await requestId();
    const call = await withStaffToken<Media>(id, (token) =>
      contentClient().uploadProductImage(
        token,
        { bytes: file, filename: file.name || "image" },
        id,
      ),
    );
    if (call.session === "expired") return fail("session_expired");
    return { status: "ok", media: call.value };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = UPLOAD_FAILURE_BY_CODE[error.code];
      if (reason) {
        return fail(reason, reason === "format_refused" ? error.problem.detail : undefined);
      }
    }
    adminLogger().warn("product image upload failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return fail("unavailable");
  }
}
