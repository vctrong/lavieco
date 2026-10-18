import Link from "next/link";
import { FiAlertTriangle, FiArrowRight } from "react-icons/fi";

import {
  ORDER_FLAG_FILTERS,
  ORDER_STATUSES,
  orderDisplayStatus,
  type EventListItem,
  type OrderList,
} from "@lavieco/shared/events";
import { Button, SelectField, TextField } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import type { OrderListFilters } from "../types";
import { formatDateTime, formatVnd } from "../utils/format";
import { OrderStatusBadge } from "./order-status-badge";
import { PageHeader } from "./page-header";

type OrdersListPageProps = {
  filters: OrderListFilters;
  page: OrderList;
  events: EventListItem[];
  refundCount: number;
};

function listHref(filters: OrderListFilters, changes: Partial<OrderListFilters>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/orders?${query}` : "/orders";
}

/** `/orders` (`order:read`): every order, filterable by event, status and flag. */
export function OrdersListPage({ filters, page, events, refundCount }: OrdersListPageProps) {
  const t = TEXT.vi;
  const any = { value: "", label: t.orders.filters.any };
  return (
    <>
      <PageHeader eyebrow={t.orders.eyebrow} title={t.orders.title} intro={t.orders.intro} />

      {refundCount > 0 && filters.flag !== "refund_required" ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-canary bg-canary/20 px-5 py-4 text-[13.5px] text-deep-blue"
        >
          <p className="flex items-start gap-2">
            <FiAlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {t.orders.refundAlert(refundCount)}
          </p>
          <Link
            href={listHref({}, { flag: "refund_required" })}
            className="font-semibold underline-offset-4 hover:underline"
          >
            {t.orders.viewRefunds}
          </Link>
        </div>
      ) : null}

      <form
        method="get"
        action="/orders"
        aria-label={t.orders.filters.label}
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <TextField
          tone="light"
          label={t.orders.filters.q}
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder={t.orders.filters.qPlaceholder}
        />
        <SelectField
          tone="light"
          label={t.orders.filters.event}
          name="eventId"
          defaultValue={filters.eventId ?? ""}
          options={[any, ...events.map((event) => ({ value: event.id, label: event.title }))]}
        />
        <SelectField
          tone="light"
          label={t.orders.filters.status}
          name="status"
          defaultValue={filters.status ?? ""}
          options={[
            any,
            ...ORDER_STATUSES.map((status) => ({
              value: status,
              label: status === "paid" ? t.statusFilter.paid : t.orderStatus[status],
            })),
          ]}
        />
        <SelectField
          tone="light"
          label={t.orders.filters.flag}
          name="flag"
          defaultValue={filters.flag ?? ""}
          options={[
            any,
            ...ORDER_FLAG_FILTERS.map((flag) => ({ value: flag, label: t.orders.flags[flag] })),
          ]}
        />
        <div className="flex items-end gap-2">
          <Button type="submit" variant="deep" size="sm" className="h-10.5 px-5">
            {t.orders.filters.apply}
          </Button>
          <Link
            href="/orders"
            className="px-2 py-2 text-[12.5px] text-deep-blue/70 underline-offset-4 hover:underline"
          >
            {t.orders.filters.reset}
          </Link>
        </div>
      </form>

      {page.items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white p-8 text-center text-[14px] text-charcoal/65">
          {t.orders.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-white">
          <table className="w-full min-w-[56rem] text-left text-[13.5px]">
            <thead className="border-b border-hairline text-[11px] uppercase tracking-museum text-deep-blue/60">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.order}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.buyer}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.event}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.amount}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.status}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.orders.columns.createdAt}
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">{t.orders.open}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {page.items.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-deep-blue">{order.orderCode}</p>
                    <p className="text-[12px] text-charcoal/60">
                      {t.orders.tickets(order.ticketCount)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-deep-blue">{order.buyer.fullName}</p>
                    <p className="break-all text-[12px] text-charcoal/60">{order.buyer.email}</p>
                  </td>
                  <td className="max-w-56 px-5 py-4 text-charcoal/80">{order.event.title}</td>
                  <td className="px-5 py-4 font-semibold text-deep-blue">
                    {order.amount === 0 ? t.free : formatVnd(order.amount)}
                  </td>
                  <td className="space-y-1 px-5 py-4">
                    <OrderStatusBadge status={orderDisplayStatus(order)} />
                    {order.flags.refundRequired ? (
                      <p className="text-[11.5px] font-semibold text-deep-blue">
                        {t.orders.flags.refund_required}
                      </p>
                    ) : null}
                    {order.flags.amountMismatch ? (
                      <p className="text-[11.5px] font-semibold text-deep-blue">
                        {t.orders.flags.amount_mismatch}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-[12.5px] text-charcoal/70">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-deep-blue hover:text-emerald-brand"
                    >
                      {t.orders.open}
                      <FiArrowRight aria-hidden="true" size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page.nextCursor ? (
        <div className="mt-6 text-right">
          <Button
            as={Link}
            href={listHref(filters, { cursor: page.nextCursor })}
            variant="secondary"
            size="sm"
          >
            {t.orders.next}
          </Button>
        </div>
      ) : null}
    </>
  );
}
