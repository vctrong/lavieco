import type { Metadata } from "next";

import { PRODUCT_STATUSES } from "@lavieco/shared/shop";

import { ProductsListPage, SHOP_TEXT, loadCatalogChoices, loadProducts } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.list.meta };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
  allowed.includes(value as T) ? (value as T) : undefined;
const objectId = (value: string | undefined) =>
  value && /^[0-9a-f]{24}$/.test(value) ? value : undefined;

export default async function ProductsRoute({ searchParams }: PageProps<"/shop/products">) {
  const params = await searchParams;
  const filters = {
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    status: pick(first(params.status), PRODUCT_STATUSES),
    categoryId: objectId(first(params.categoryId)),
    stock: pick(first(params.stock), ["low", "out"] as const),
  };
  const [page, choices] = await Promise.all([
    loadProducts({ ...filters, cursor: first(params.cursor)?.slice(0, 512) }),
    loadCatalogChoices("/shop/products"),
  ]);
  return <ProductsListPage page={page} filters={filters} {...choices} />;
}
