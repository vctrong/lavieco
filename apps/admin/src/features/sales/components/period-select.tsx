"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SALES_SUMMARY_PERIODS, type SalesSummaryPeriod } from "@lavieco/shared/sales";
import { Button, SelectField } from "@lavieco/ui";

import { TEXT } from "../constants/text";

const t = TEXT.vi.summary;

/**
 * Period of the summary (`?ky=`). Choosing one reloads the figures at once; without
 * JavaScript the form and its button do the same.
 */
export function PeriodSelect({ value }: { value: SalesSummaryPeriod }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form method="get" action="/sales/summary" className="flex items-end gap-2" aria-busy={pending}>
      <SelectField
        tone="light"
        name="ky"
        label={t.period}
        defaultValue={value}
        options={SALES_SUMMARY_PERIODS.map((period) => ({
          value: period,
          label: t.periods[period],
        }))}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => router.push(`/sales/summary?ky=${next}`));
        }}
        wrapperClassName="min-w-52"
        className="text-[16px]"
      />
      <noscript>
        <Button type="submit" variant="deep" size="sm" className="h-11 px-4">
          {t.apply}
        </Button>
      </noscript>
    </form>
  );
}
