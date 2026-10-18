import type { Metadata } from "next";

import {
  TICKETING_TEXT,
  OrdersListPage,
  loadOrders,
  type OrderListFilters,
} from "@/features/ticketing";

export const metadata: Metadata = { title: TICKETING_TEXT.vi.orders.title };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function OrdersRoute({ searchParams }: PageProps<"/orders">) {
  const params = await searchParams;
  const filters: OrderListFilters = {
    eventId: first(params.eventId),
    status: first(params.status),
    flag: first(params.flag),
    q: first(params.q),
    cursor: first(params.cursor),
  };
  const { page, events, refundCount } = await loadOrders(filters);
  return <OrdersListPage filters={filters} page={page} events={events} refundCount={refundCount} />;
}
