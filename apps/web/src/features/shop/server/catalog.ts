import "server-only";

import { unstable_cache } from "next/cache";

import { isServiceProblem } from "@lavieco/api-clients";
import {
  PUBLIC_PRODUCT_SORTS,
  SHOP_CACHE_TAGS,
  type PublicProduct,
  type PublicProductCard,
  type PublicProductSort,
} from "@lavieco/shared/shop";

import { programClient, webLogger } from "@/lib/services";

/** Fallback lifetime; program-service asks for a revalidation on every public change. */
const CACHE_SECONDS = 300;
/** Products per numbered page of `/bo-suu-tap`. */
export const PAGE_SIZE = 12;
/** Upper bound of the walk below: 10 × 100 products is far beyond the GĐ1 catalogue. */
const MAX_BATCHES = 10;
const BATCH = 100;

/**
 * The whole published list of one category and sort, walked with the service's cursor
 * (docs/02: lists are cursor-paginated) and cached as one entry. Numbered pages are cut
 * from it here, so a visitor can jump straight to page 3 and see how many pages there are.
 */
const cachedAll = unstable_cache(
  async (category: string, sort: PublicProductSort) => {
    const items: PublicProductCard[] = [];
    let cursor: string | undefined;
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const page = await programClient().listPublicProducts({
        category: category || undefined,
        sort,
        cursor,
        limit: BATCH,
      });
      items.push(...page.items);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return items;
  },
  ["shop-products-all"],
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

export type CollectionFilters = { category: string; sort: PublicProductSort; page: number };

export type CollectionPageData = {
  items: PublicProductCard[];
  page: number;
  pages: number;
  total: number;
};

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
    page: /^[1-9]d{0,3}$/.test(first(params.trang)) ? Number(first(params.trang)) : 1,
  };
}

/** The list the page renders, or a failure it shows as such (never a fake empty list). */
export async function loadCollection(
  filters: CollectionFilters,
): Promise<{ status: "ok"; data: CollectionPageData } | { status: "error" }> {
  try {
    const all = await cachedAll(filters.category, filters.sort);
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    // A page past the end (old link, fewer products now) shows the last one, not nothing.
    const page = Math.min(filters.page, pages);
    return {
      status: "ok",
      data: {
        items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        page,
        pages,
        total: all.length,
      },
    };
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

/** Published reviews of a product; an empty list when the service cannot answer. */
export async function loadProductReviews(slug: string) {
  const cached = unstable_cache(
    () => programClient().getProductReviews(slug),
    ["shop-product-reviews", slug],
    { tags: [SHOP_CACHE_TAGS.product(slug)], revalidate: CACHE_SECONDS },
  );
  try {
    return await cached();
  } catch {
    return { average: 0, count: 0, items: [] };
  }
}
