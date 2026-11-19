import type { Metadata } from "next";

import { SALES_TEXT, SummaryPage, loadSalesSummary } from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.summary };

export default async function SalesSummaryRoute() {
  return <SummaryPage summary={await loadSalesSummary("/sales/summary", 6)} />;
}
