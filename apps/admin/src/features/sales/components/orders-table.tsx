"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FiArrowDown, FiArrowUp } from "react-icons/fi";

import {
  SALES_ORDER_STATUSES,
  type SalesOrder,
  type SalesOrderSort,
  type SalesOrderStatus,
} from "@lavieco/shared/sales";
import { Button, choiceControlClass, cn, useToast } from "@lavieco/ui";

import { callAction } from "@/shared/call-action";

import { bulkSalesOrderStatus } from "../actions/sales";
import { TEXT } from "../constants/text";
import { failureMessage } from "../utils/failure";
import { itemsSummary, money } from "../utils/format";
import { listHref, type SalesListFilters } from "../utils/list-href";
import { DueLabel, PaymentLabel, StatusPill } from "./pills";

const t = TEXT.vi;

const SORTABLE: { key: SalesOrderSort; column: keyof typeof t.list.columns }[] = [
  { key: "code", column: "code" },
  { key: "total", column: "total" },
  { key: "due_day", column: "due" },
];

/** Desktop table (≥ 1200 px): sortable columns, keyboard reachable rows, bulk status. */
export function OrdersTable({
  orders,
  filters,
  selectedId,
}: {
  orders: SalesOrder[];
  filters: SalesListFilters;
  selectedId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<SalesOrderStatus>("in_progress");
  const [busy, startTransition] = useTransition();

  const sort = (filters.sort ?? "order_day") as SalesOrderSort;
  const dir = filters.dir === "asc" ? "asc" : "desc";
  const sortHref = (key: SalesOrderSort) =>
    listHref(filters, {
      sort: key,
      dir: sort === key && dir === "desc" ? "asc" : "desc",
      cursor: "",
    });

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const all = orders.length > 0 && orders.every((order) => selected.has(order.id));

  const applyBulk = () =>
    startTransition(async () => {
      const result = await callAction(() =>
        bulkSalesOrderStatus({ ids: [...selected], status: target }),
      );
      if (result.status === "ok") {
        toast({
          tone: "success",
          message: t.list.bulkDone(result.data.updated, result.data.skipped),
        });
        setSelected(new Set());
        router.refresh();
      } else toast({ tone: "error", message: failureMessage(result) });
    });

  const header = (label: string, key?: SalesOrderSort) => {
    if (!key) return label;
    const active = sort === key;
    return (
      <Link
        href={sortHref(key)}
        className="inline-flex min-h-11 items-center gap-1 hover:text-deep-blue focus-visible:outline-2 focus-visible:outline-deep-blue"
        aria-label={`${label}${active ? (dir === "asc" ? " ↑" : " ↓") : ""}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <FiArrowUp aria-hidden="true" />
          ) : (
            <FiArrowDown aria-hidden="true" />
          )
        ) : null}
      </Link>
    );
  };
  const sortOf = (column: keyof typeof t.list.columns) =>
    SORTABLE.find((entry) => entry.column === column)?.key;

  return (
    <div className="min-w-0">
      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-3xl border border-deep-blue/20 bg-mint-mist px-4 py-2">
          <span className="text-[14px] font-semibold text-deep-blue">
            {t.list.selected(selected.size)}
          </span>
          <label className="flex items-center gap-2 text-[14px] text-charcoal">
            {t.list.bulkTo}
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as SalesOrderStatus)}
              className="min-h-11 rounded-xl border border-hairline bg-white px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-deep-blue"
            >
              {SALES_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.labels.status[status]}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="deep"
            size="sm"
            className="min-h-11 px-4"
            onClick={applyBulk}
            disabled={busy}
          >
            {t.list.bulkApply}
          </Button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-hairline text-[12.5px] uppercase tracking-wide text-charcoal/60">
            <tr>
              <th scope="col" className="w-12 px-4">
                <input
                  type="checkbox"
                  aria-label={t.list.selectAll}
                  checked={all}
                  onChange={() =>
                    setSelected(all ? new Set() : new Set(orders.map((order) => order.id)))
                  }
                  className={choiceControlClass("light", "size-5")}
                />
              </th>
              {(Object.keys(t.list.columns) as (keyof typeof t.list.columns)[]).map((column) => (
                <th key={column} scope="col" className="px-3 py-1 font-semibold">
                  {header(t.list.columns[column], sortOf(column))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const items = itemsSummary(order, 1);
              const href = listHref(filters, { id: order.id });
              return (
                <tr
                  key={order.id}
                  aria-selected={order.id === selectedId}
                  className={cn(
                    "border-b border-hairline last:border-0 hover:bg-mint-mist/60",
                    order.id === selectedId && "bg-mint-mist",
                    order.deletedAt && "opacity-60",
                  )}
                >
                  <td className="px-4">
                    <input
                      type="checkbox"
                      aria-label={t.list.select(order.code)}
                      checked={selected.has(order.id)}
                      onChange={() => toggle(order.id)}
                      className={choiceControlClass("light", "size-5")}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={href}
                      scroll={false}
                      className="font-mono font-semibold text-deep-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-deep-blue"
                    >
                      {order.code}
                    </Link>
                  </td>
                  <td className="max-w-48 truncate px-3 py-3 font-medium">{order.customer.name}</td>
                  <td className="max-w-56 truncate px-3 py-3 text-charcoal/80">
                    {items.text}
                    {items.more ? ` ${t.list.more(items.more)}` : ""}
                  </td>
                  <td className="px-3 py-3 font-semibold whitespace-nowrap text-deep-blue">
                    {money(order.total)}
                  </td>
                  <td className="px-3 py-3">
                    <DueLabel order={order} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PaymentLabel status={order.paymentStatus} />
                  </td>
                  <td className="max-w-32 truncate px-3 py-3 text-charcoal/80">
                    {order.assignee?.name || t.list.nobody}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
