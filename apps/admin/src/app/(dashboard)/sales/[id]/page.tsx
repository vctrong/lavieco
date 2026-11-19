import type { Metadata } from "next";

import { OrderDetail, SALES_TEXT, loadSalesOrder } from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.detail };

export default async function SalesOrderRoute({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const order = await loadSalesOrder(id);
  // Keyed by revision: after a change the detail starts again from the saved order.
  return <OrderDetail key={order.revision} order={order} variant="page" closeHref="/sales" />;
}
