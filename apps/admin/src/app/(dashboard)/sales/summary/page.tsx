import type { Metadata } from "next";

import { salesSummaryPeriodSchema } from "@lavieco/shared/sales";

import { SALES_TEXT, SummaryPage, loadSalesSummary } from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.summary };

export default async function SalesSummaryRoute({ searchParams }: PageProps<"/sales/summary">) {
  const raw = (await searchParams).ky;
  const parsed = salesSummaryPeriodSchema.safeParse(Array.isArray(raw) ? raw[0] : raw);
  const period = parsed.success ? parsed.data : "6";
  return <SummaryPage summary={await loadSalesSummary(`/sales/summary?ky=${period}`, period)} />;
}
