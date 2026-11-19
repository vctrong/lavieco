import Link from "next/link";
import { FiArrowRight, FiFilter, FiPlus, FiSearch, FiUser } from "react-icons/fi";

import {
  SALES_ORDER_STATUSES,
  SALES_ORDER_TYPES,
  SALES_ORDER_VIEWS,
  SALES_PAYMENT_STATUSES,
  type SalesOrder,
  type SalesOrderList,
  type SalesSummary,
  type StaffRef,
} from "@lavieco/shared/sales";
import { Button, SelectField, TextField, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { itemsSummary, money } from "../utils/format";
import { listHref, type SalesListFilters } from "../utils/list-href";
import { NewOrderShortcut } from "./new-order-shortcut";
import { OrderDetail } from "./order-detail";
import { OrdersTable } from "./orders-table";
import { DueLabel, PaymentLabel, StatusPill } from "./pills";
import { SalesShell } from "./sales-shell";

const t = TEXT.vi;

function OrderCard({ order }: { order: SalesOrder }) {
  const items = itemsSummary(order);
  return (
    <Link
      href={`/sales/${order.id}`}
      className="flex h-full flex-col gap-2 rounded-3xl border border-hairline bg-white p-4 hover:border-emerald-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[14px] font-semibold text-deep-blue">{order.code}</p>
          <p className="truncate text-[16px] font-semibold text-charcoal">{order.customer.name}</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <p className="text-[15px] text-charcoal/80">
        {items.text}
        {items.more ? <span className="text-charcoal/60"> {t.list.more(items.more)}</span> : null}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1">
        <span className="text-[16px] font-semibold text-deep-blue">{money(order.total)}</span>
        <PaymentLabel status={order.paymentStatus} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-charcoal/70">
        <DueLabel order={order} />
        <span className="inline-flex items-center gap-1">
          <FiUser aria-hidden="true" />
          {order.assignee?.name || t.list.nobody}
        </span>
      </div>
    </Link>
  );
}

/**
 * `/sales` (UC-41): phone first. Chips with counts, a search box, cards (one column on
 * phones, two on tablets); from 1200 px a sortable table with bulk status and the detail
 * of the selected order beside it.
 */
export function OrdersPage({
  page,
  summary,
  filters,
  assignees,
  panel,
}: {
  page: SalesOrderList;
  summary: SalesSummary;
  filters: SalesListFilters;
  assignees: StaffRef[];
  panel: SalesOrder | null;
}) {
  const filtered = Boolean(
    filters.q ||
    filters.status ||
    filters.paymentStatus ||
    filters.orderType ||
    filters.assigneeId ||
    filters.from ||
    filters.to ||
    filters.deleted,
  );
  const select = (name: string, label: string, options: { value: string; label: string }[]) => (
    <SelectField
      tone="light"
      label={label}
      name={name}
      defaultValue={String(filters[name as keyof SalesListFilters] ?? "")}
      options={[{ value: "", label: t.list.any }, ...options]}
    />
  );
  return (
    <SalesShell
      section="orders"
      title={t.title}
      intro={t.intro}
      wide
      actions={
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-[12.5px] text-charcoal/60">{t.list.createShortcut}</span>
          <Button
            as={Link}
            href="/sales/new"
            variant="primary"
            size="sm"
            className="min-h-11 gap-1.5 px-5"
          >
            <FiPlus aria-hidden="true" />
            {t.list.create}
          </Button>
        </div>
      }
    >
      <NewOrderShortcut />

      <nav aria-label={t.list.filters} className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-2">
          {SALES_ORDER_VIEWS.map((view) => {
            const current = filters.view === view && !filters.deleted;
            return (
              <li key={view}>
                <Link
                  href={listHref({ view }, { view })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue",
                    current
                      ? "bg-deep-blue font-semibold text-soft-white"
                      : "border border-hairline bg-white text-deep-blue hover:bg-mint-mist",
                    view === "overdue" &&
                      summary.views.overdue > 0 &&
                      !current &&
                      "border-error/40 text-error",
                  )}
                >
                  {t.labels.views[view]}
                  <span
                    className={cn(
                      "rounded-full px-2 text-[12.5px] font-semibold",
                      current ? "bg-soft-white/20" : "bg-mint-mist",
                    )}
                  >
                    {summary.views[view]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="get" action="/sales" className="mb-5 space-y-3">
        <input type="hidden" name="view" value={filters.view} />
        <div className="flex items-end gap-2">
          <TextField
            tone="light"
            label={t.list.search}
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            wrapperClassName="min-w-0 flex-1"
          />
          <Button type="submit" variant="deep" size="sm" className="h-11 gap-1.5 px-4">
            <FiSearch aria-hidden="true" />
            <span className="sr-only md:not-sr-only">{t.list.searchButton}</span>
          </Button>
        </div>
        <details
          className="group rounded-3xl border border-hairline bg-white md:open:p-0"
          open={filtered}
        >
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-[15px] font-medium text-deep-blue">
            <FiFilter aria-hidden="true" />
            {t.list.filters}
          </summary>
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4 min-[1200px]:grid-cols-7">
            {select(
              "status",
              t.list.status,
              SALES_ORDER_STATUSES.map((value) => ({ value, label: t.labels.status[value] })),
            )}
            {select(
              "paymentStatus",
              t.list.payment,
              SALES_PAYMENT_STATUSES.map((value) => ({ value, label: t.labels.payment[value] })),
            )}
            {select(
              "orderType",
              t.list.type,
              SALES_ORDER_TYPES.map((value) => ({ value, label: t.labels.type[value] })),
            )}
            {select("assigneeId", t.list.assignee, [
              { value: "none", label: t.list.nobody },
              ...assignees.map((staff) => ({ value: staff.id, label: staff.name })),
            ])}
            <TextField
              tone="light"
              label={t.list.from}
              name="from"
              type="date"
              defaultValue={filters.from ?? ""}
            />
            <TextField
              tone="light"
              label={t.list.to}
              name="to"
              type="date"
              defaultValue={filters.to ?? ""}
            />
            <div className="flex flex-col justify-end gap-2">
              <label className="flex min-h-11 items-center gap-2 text-[14px] text-charcoal">
                <input
                  type="checkbox"
                  name="deleted"
                  value="true"
                  defaultChecked={filters.deleted}
                  className="size-5 accent-emerald-ink"
                />
                {t.list.deleted}
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="deep" size="sm" className="min-h-11 flex-1 px-4">
                  {t.list.apply}
                </Button>
                {filtered ? (
                  <Link
                    href={listHref({ view: filters.view }, {})}
                    className="flex min-h-11 items-center rounded-full px-3 text-[13px] text-deep-blue underline"
                  >
                    {t.list.clear}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </details>
      </form>

      <p className="mb-3 text-[13px] text-charcoal/60" aria-live="polite">
        {t.list.showing(page.items.length, page.total)}
      </p>

      {page.items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white px-5 py-16 text-center text-[15px] text-charcoal/60">
          {filtered || filters.view !== "all" ? t.list.empty : t.list.emptyAll}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2 min-[1200px]:hidden">
            {page.items.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
          <div
            className={cn(
              "hidden min-[1200px]:grid min-[1200px]:gap-5",
              panel && "min-[1200px]:grid-cols-[minmax(0,1fr)_26rem]",
            )}
          >
            <OrdersTable orders={page.items} filters={filters} selectedId={panel?.id ?? null} />
            {panel ? (
              <aside className="sticky top-6 max-h-[calc(100dvh-3rem)] self-start overflow-y-auto rounded-3xl border border-hairline bg-white p-5">
                <OrderDetail
                  order={panel}
                  assignees={assignees}
                  variant="panel"
                  closeHref={listHref(filters, { id: "" })}
                />
              </aside>
            ) : null}
          </div>
        </>
      )}

      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={listHref(filters, { cursor: page.nextCursor, id: "" })}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-white px-4 text-[14px] text-deep-blue hover:bg-mint-mist"
          >
            {t.list.next}
            <FiArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      ) : null}

      <Link
        href="/sales/new"
        aria-label={t.list.create}
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center rounded-full bg-emerald-brand text-charcoal shadow-emerald-cta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue md:hidden"
      >
        <FiPlus aria-hidden="true" size={26} />
      </Link>
    </SalesShell>
  );
}
