import Link from "next/link";
import { FiAlertTriangle, FiArrowRight } from "react-icons/fi";

import { SHOP_ORDER_STATUSES, type ShopOrderList } from "@lavieco/shared/shop";
import { Button, SelectField, TextField, cn } from "@lavieco/ui";

import { TEXT } from "../constants/text";
import { ExportOrdersButton } from "./order-detail";
import { ShopShell } from "./shop-shell";

const t = TEXT.vi.orders;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const time = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const STATUS_STYLE: Record<string, string> = {
  awaiting_payment: "bg-canary/40 text-charcoal",
  awaiting_confirmation: "bg-canary/40 text-charcoal",
  paid: "bg-mint-mist text-emerald-ink",
  confirmed: "bg-mint-mist text-emerald-ink",
  packing: "bg-deep-blue/10 text-deep-blue",
  shipped: "bg-deep-blue/10 text-deep-blue",
  delivered: "bg-mint-mist text-emerald-ink",
  completed: "bg-mint-mist text-emerald-ink",
  cancelled: "bg-charcoal/8 text-charcoal/70",
  expired: "bg-charcoal/8 text-charcoal/70",
  refunded: "bg-error/10 text-error",
  returned: "bg-charcoal/8 text-charcoal/70",
};

type Filters = { view: "todo" | "all"; status?: string; q?: string };

/** `/shop/orders` (UC-40): cards that work on a phone; "Cần xử lý" is the packing list. */
export function OrdersListPage({ page, filters }: { page: ShopOrderList; filters: Filters }) {
  const params = (extra: Record<string, string>) =>
    new URLSearchParams(
      Object.entries({ ...filters, ...extra }).filter(([, v]) => v) as [string, string][],
    ).toString();
  return (
    <ShopShell section="orders" title={t.title} intro={t.intro} actions={<ExportOrdersButton />}>
      <div className="mb-4 flex gap-2">
        {(["todo", "all"] as const).map((view) => (
          <Link
            key={view}
            href={`/shop/orders?${params({ view, status: "", cursor: "" })}`}
            aria-current={filters.view === view ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-full px-4 text-[13px]",
              filters.view === view
                ? "bg-deep-blue font-semibold text-soft-white"
                : "border border-hairline bg-white text-deep-blue",
            )}
          >
            {t.views[view]}
          </Link>
        ))}
      </div>
      <form
        method="get"
        action="/shop/orders"
        className="mb-6 grid gap-4 rounded-3xl border border-hairline bg-white p-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="view" value="all" />
        <TextField tone="light" label={t.q} name="q" defaultValue={filters.q ?? ""} />
        <SelectField
          tone="light"
          label={t.status}
          name="status"
          defaultValue={filters.status ?? ""}
          options={[
            { value: "", label: TEXT.vi.list.filters.any },
            ...SHOP_ORDER_STATUSES.map((value) => ({ value, label: t.statuses[value] })),
          ]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="deep" size="sm" className="h-10.5 w-full px-5 md:w-auto">
            {t.apply}
          </Button>
        </div>
      </form>
      {page.items.length === 0 ? (
        <p className="rounded-3xl border border-hairline bg-white px-5 py-16 text-center text-[14px] text-charcoal/60">
          {t.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {page.items.map((order) => {
            const flagged = order.flags.refundRequired || order.flags.amountMismatch;
            return (
              <li key={order.id}>
                <Link
                  href={`/shop/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-hairline bg-white p-4 hover:border-emerald-brand"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-deep-blue">
                        {order.publicCode}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                          STATUS_STYLE[order.status],
                        )}
                      >
                        {t.statuses[order.status]}
                      </span>
                      <span className="text-[12px] text-charcoal/60">
                        {t.payment[order.paymentMethod]}
                      </span>
                      {flagged ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-error">
                          <FiAlertTriangle aria-hidden="true" />
                          {order.flags.refundRequired
                            ? t.flags.refundRequired
                            : t.flags.amountMismatch}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[13.5px] text-charcoal/80">
                      {order.buyer.fullName} ·{" "}
                      {t.items(order.items.reduce((s, i) => s + i.quantity, 0))} ·{" "}
                      {money.format(order.amount)}
                    </p>
                    <p className="text-[12px] text-charcoal/60">
                      {time.format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <FiArrowRight aria-hidden="true" className="shrink-0 text-deep-blue/50" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {page.nextCursor ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/shop/orders?${params({ cursor: page.nextCursor })}`}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-hairline px-4 text-[12.5px] text-deep-blue hover:bg-mint-mist"
          >
            {t.next}
            <FiArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      ) : null}
    </ShopShell>
  );
}
