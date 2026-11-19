import type { Metadata } from "next";

import {
  SALES_ORDER_SORTS,
  SALES_ORDER_STATUSES,
  SALES_ORDER_TYPES,
  SALES_ORDER_VIEWS,
  SALES_PAYMENT_STATUSES,
  type SalesOrderView,
} from "@lavieco/shared/sales";

import {
  OrdersPage,
  SALES_TEXT,
  loadAssignees,
  loadSalesOrderPanel,
  loadSalesOrders,
  loadSalesSummary,
  type SalesListFilters,
} from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.list };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const oneOf = <T extends string>(values: readonly T[], value: string | undefined) =>
  value && (values as readonly string[]).includes(value) ? (value as T) : undefined;
const day = (value: string | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export default async function SalesRoute({ searchParams }: PageProps<"/sales">) {
  const params = await searchParams;
  const filters: SalesListFilters = {
    view: oneOf<SalesOrderView>(SALES_ORDER_VIEWS, first(params.view)) ?? "all",
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    status: oneOf(SALES_ORDER_STATUSES, first(params.status)),
    paymentStatus: oneOf(SALES_PAYMENT_STATUSES, first(params.paymentStatus)),
    orderType: oneOf(SALES_ORDER_TYPES, first(params.orderType)),
    assigneeId: first(params.assigneeId)?.match(/^(none|[0-9a-f]{24})$/)?.[0],
    from: day(first(params.from)),
    to: day(first(params.to)),
    sort: oneOf(SALES_ORDER_SORTS, first(params.sort)),
    dir: first(params.dir) === "asc" ? "asc" : undefined,
    deleted: first(params.deleted) === "true",
    id: first(params.id)?.match(/^[0-9a-f]{24}$/)?.[0],
  };
  const [page, summary, assignees, panel] = await Promise.all([
    loadSalesOrders("/sales", {
      view: filters.view,
      q: filters.q,
      status: filters.status ? [filters.status] : undefined,
      paymentStatus: filters.paymentStatus ? [filters.paymentStatus] : undefined,
      orderType: filters.orderType ? [filters.orderType] : undefined,
      assigneeId: filters.assigneeId,
      from: filters.from,
      to: filters.to,
      sort: oneOf(SALES_ORDER_SORTS, filters.sort),
      dir: filters.dir === "asc" ? "asc" : "desc",
      deleted: filters.deleted,
      cursor: first(params.cursor)?.slice(0, 200),
    }),
    loadSalesSummary("/sales", "1"),
    loadAssignees("/sales"),
    loadSalesOrderPanel(filters.id),
  ]);
  return (
    <OrdersPage
      page={page}
      summary={summary}
      filters={filters}
      assignees={assignees}
      panel={panel}
    />
  );
}
