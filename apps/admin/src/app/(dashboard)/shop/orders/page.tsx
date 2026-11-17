import type { Metadata } from "next";

import { SHOP_ORDER_STATUSES } from "@lavieco/shared/shop";

import { OrdersListPage, SHOP_TEXT, loadShopOrders } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.orders.meta };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ShopOrdersRoute({ searchParams }: PageProps<"/shop/orders">) {
  const params = await searchParams;
  const status = first(params.status);
  const filters = {
    view: first(params.view) === "all" ? ("all" as const) : ("todo" as const),
    status: (SHOP_ORDER_STATUSES as readonly string[]).includes(status ?? "") ? status : undefined,
    q: first(params.q)?.trim().slice(0, 100) || undefined,
  };
  const page = await loadShopOrders({
    view: filters.status ? "all" : filters.view,
    status: filters.status as (typeof SHOP_ORDER_STATUSES)[number] | undefined,
    q: filters.q,
    cursor: first(params.cursor)?.slice(0, 200),
  });
  return <OrdersListPage page={page} filters={filters} />;
}
