import type { Metadata } from "next";

import { OrderForm, SALES_TEXT, loadAssignees, loadPriceItems, vnToday } from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.new };

export default async function NewSalesOrderRoute() {
  const [priceItems, assignees] = await Promise.all([
    loadPriceItems("/sales/new"),
    loadAssignees("/sales/new"),
  ]);
  return (
    <OrderForm
      order={null}
      priceItems={priceItems}
      assignees={assignees}
      today={vnToday()}
      closeHref="/sales"
    />
  );
}
