import type { Metadata } from "next";

import {
  OrderForm,
  SALES_TEXT,
  TeamFieldsForm,
  loadAssignees,
  loadPriceItems,
  loadSalesOrder,
  vnToday,
} from "@/features/sales";

export const metadata: Metadata = { title: SALES_TEXT.vi.meta.edit };

export default async function EditSalesOrderRoute({ params }: PageProps<"/sales/[id]/edit">) {
  const { id } = await params;
  const path = `/sales/${id}/edit`;
  const [order, priceItems, assignees] = await Promise.all([
    loadSalesOrder(id),
    loadPriceItems(path),
    loadAssignees(path),
  ]);
  const closeHref = `/sales/${order.id}`;
  if (order.source === "web")
    return (
      <TeamFieldsForm
        key={order.revision}
        order={order}
        assignees={assignees}
        closeHref={closeHref}
      />
    );
  return (
    <OrderForm
      key={order.revision}
      order={order}
      priceItems={priceItems}
      assignees={assignees}
      today={vnToday()}
      closeHref={closeHref}
    />
  );
}
