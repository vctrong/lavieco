import "server-only";

import { unstable_cache } from "next/cache";

import { isServiceProblem } from "@lavieco/api-clients";
import {
  PUBLIC_PRODUCT_SORTS,
  SHOP_CACHE_TAGS,
  type PublicProduct,
  type PublicProductList,
  type PublicProductSort,
} from "@lavieco/shared/shop";

import { programClient, webLogger } from "@/lib/services";

/** Fallback lifetime; program-service asks for a revalidation on every public change. */
const CACHE_SECONDS = 300;
const PAGE_SIZE = 24;

const cachedList = unstable_cache(
  (category: string, sort: PublicProductSort, cursor: string) =>
    programClient().listPublicProducts({
      category: category || undefined,
      sort,
      cursor: cursor || undefined,
      limit: PAGE_SIZE,
    }),
  ["shop-products-list"],
  { tags: [SHOP_CACHE_TAGS.products], revalidate: CACHE_SECONDS },
);

const cachedCategories = unstable_cache(
  async () => (await programClient().listPublicCategories()).items,
  ["shop-categories"],
  { tags: [SHOP_CACHE_TAGS.categories], revalidate: CACHE_SECONDS },
);

const cachedSettings = unstable_cache(
  () => programClient().getPublicShopSettings(),
  ["shop-settings"],
  { tags: [SHOP_CACHE_TAGS.products], revalidate: CACHE_SECONDS },
);

export type CollectionFilters = { category: string; sort: PublicProductSort; cursor: string };

export function toFilters(
  params: Record<string, string | string[] | undefined>,
): CollectionFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const sort = first(params.sap_xep);
  return {
    category: /^[a-z0-9-]{1,80}$/.test(first(params.danh_muc)) ? first(params.danh_muc) : "",
    sort: (PUBLIC_PRODUCT_SORTS as readonly string[]).includes(sort)
      ? (sort as PublicProductSort)
      : "featured",
    cursor: first(params.trang).slice(0, 200),
  };
}

/** The list the page renders, or a failure it shows as such (never a fake empty list). */
export async function loadCollection(
  filters: CollectionFilters,
): Promise<{ status: "ok"; page: PublicProductList } | { status: "error" }> {
  try {
    return { status: "ok", page: await cachedList(filters.category, filters.sort, filters.cursor) };
  } catch (error) {
    webLogger().warn("shop list failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return { status: "error" };
  }
}

export async function loadCategories() {
  try {
    return await cachedCategories();
  } catch {
    return [];
  }
}

export async function loadShopSettings() {
  try {
    return await cachedSettings();
  } catch {
    return null;
  }
}

/** A published product by slug (or a former slug); null for 404. */
export async function loadProduct(slug: string): Promise<PublicProduct | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  const cached = unstable_cache(
    () => programClient().getPublicProduct(slug),
    ["shop-product", slug],
    { tags: [SHOP_CACHE_TAGS.products, SHOP_CACHE_TAGS.product(slug)], revalidate: CACHE_SECONDS },
  );
  try {
    return await cached();
  } catch (error) {
    if (isServiceProblem(error) && error.status === 404) return null;
    throw error;
  }
}
