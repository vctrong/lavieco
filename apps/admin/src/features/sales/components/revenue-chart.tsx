"use client";

import { useState } from "react";

import type { SalesSummary } from "@lavieco/shared/sales";

import { TEXT } from "../constants/text";
import { money } from "../utils/format";

const t = TEXT.vi.summary;

/**
 * Revenue by month: one series, so one hue and no legend (the heading names it). Thin
 * bars with rounded data ends on a recessive baseline; hover or focus shows the value,
 * and the same numbers sit in a table under the chart (the Emerald fill is below 3:1 on
 * white, so the values must not depend on the bar alone).
 */
export function RevenueChart({ months }: { months: SalesSummary["revenueByMonth"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((month) => month.revenue));
  return (
    <figure>
      <figcaption className="sr-only">{t.chartLabel}</figcaption>
      <div className="relative">
        <div className="flex h-56 items-end gap-[2px] border-b border-hairline">
          {months.map((month, index) => {
            const height = Math.round((month.revenue / max) * 100);
            return (
              <button
                key={month.month}
                type="button"
                aria-label={`${t.month(month.month)}: ${money(month.revenue)}, ${t.orders(month.orders)}`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-deep-blue"
              >
                <span
                  className="w-full max-w-10 rounded-t-[4px] bg-emerald-brand group-hover:bg-emerald-ink"
                  style={{ height: `${Math.max(height, month.revenue > 0 ? 1 : 0)}%` }}
                />
                {active === index ? (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-xl bg-deep-blue px-3 py-1.5 text-left text-[12.5px] whitespace-nowrap text-soft-white shadow-md">
                    <span className="block font-semibold">{money(month.revenue)}</span>
                    {t.orders(month.orders)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-[2px]">
          {months.map((month) => (
            <span key={month.month} className="flex-1 text-center text-[12.5px] text-charcoal/60">
              {t.month(month.month)}
            </span>
          ))}
        </div>
      </div>
      <table className="mt-4 w-full text-[13.5px]">
        <caption className="sr-only">{t.revenue}</caption>
        <tbody className="divide-y divide-hairline">
          {months.map((month) => (
            <tr key={month.month}>
              <th scope="row" className="py-1.5 text-left font-normal text-charcoal/70">
                {t.month(month.month)}
              </th>
              <td className="py-1.5 text-right text-charcoal/70">{t.orders(month.orders)}</td>
              <td className="py-1.5 text-right font-semibold text-charcoal">
                {money(month.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
