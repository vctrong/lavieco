import Link from "next/link";
import { FiAlertCircle } from "react-icons/fi";

import { SALES_ORDER_STATUSES, type SalesSummary } from "@lavieco/shared/sales";

import { TEXT } from "../constants/text";
import { money } from "../utils/format";
import { StatusPill } from "./pills";
import { SalesShell } from "./sales-shell";
import { RevenueChart } from "./revenue-chart";

const t = TEXT.vi.summary;

function Stat({
  label,
  value,
  note,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  tone?: "default" | "alert";
}) {
  const body = (
    <>
      <p className="text-[14px] text-charcoal/70">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-display text-3xl text-deep-blue">
        {tone === "alert" ? (
          <FiAlertCircle aria-hidden="true" className="text-error" size={22} />
        ) : null}
        {value}
      </p>
      {note ? <p className="mt-1 text-[13px] text-charcoal/60">{note}</p> : null}
    </>
  );
  const className =
    "block rounded-3xl border border-hairline bg-white p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-blue";
  return href ? (
    <Link href={href} className={`${className} hover:border-emerald-brand`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** `/sales/summary`: stat tiles everywhere; the monthly revenue chart from 768 px. */
export function SummaryPage({ summary }: { summary: SalesSummary }) {
  const current = summary.revenueByMonth.at(-1);
  const open = summary.byStatus.new + summary.byStatus.in_progress + summary.byStatus.shipping;
  return (
    <SalesShell section="summary" title={t.title} intro={t.intro}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.outstanding}
          value={money(summary.outstanding.amount)}
          note={t.outstandingOrders(summary.outstanding.orders)}
          href="/sales?view=unpaid"
        />
        <Stat
          label={t.revenueMonth}
          value={money(current?.revenue ?? 0)}
          note={t.ordersMonth(current?.orders ?? 0)}
        />
        <Stat label={t.openOrders} value={String(open)} href="/sales?view=todo" />
        <Stat
          label={t.overdue}
          value={String(summary.views.overdue)}
          href="/sales?view=overdue"
          tone={summary.views.overdue > 0 ? "alert" : "default"}
        />
      </div>

      <section className="mb-5 rounded-3xl border border-hairline bg-white p-5">
        <h2 className="mb-3 text-[17px] font-semibold text-deep-blue">{t.byStatus}</h2>
        <ul className="grid gap-2 sm:grid-cols-5">
          {SALES_ORDER_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={`/sales?status=${status}`}
                className="flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-hairline px-3 py-2 hover:border-emerald-brand"
              >
                <StatusPill status={status} />
                <span className="text-[17px] font-semibold text-charcoal">
                  {summary.byStatus[status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="hidden rounded-3xl border border-hairline bg-white p-5 md:block">
        <h2 className="mb-4 text-[17px] font-semibold text-deep-blue">{t.revenue}</h2>
        <RevenueChart months={summary.revenueByMonth} />
      </section>
    </SalesShell>
  );
}
