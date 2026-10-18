import type { Metadata } from "next";

import { requireStaff } from "@/features/shell";
import { TICKETING_TEXT, OrderDetailPage, loadOrder } from "@/features/ticketing";

export const metadata: Metadata = { title: TICKETING_TEXT.vi.orders.title };

export default async function OrderRoute({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const [staff, order] = await Promise.all([requireStaff(`/orders/${id}`), loadOrder(id)]);
  return <OrderDetailPage order={order} staff={staff} />;
}
