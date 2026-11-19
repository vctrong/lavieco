import type { Metadata } from "next";

import { PriceListPage, SALES_TEXT, loadPriceItems } from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.prices };

export default async function PriceListRoute() {
  return <PriceListPage items={await loadPriceItems("/sales/prices")} />;
}
