import type { Metadata } from "next";

import { OrderDetail, SHOP_TEXT, loadShopOrder } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.orders.meta };

export default async function ShopOrderRoute({ params }: PageProps<"/shop/orders/[id]">) {
  const { id } = await params;
  const order = await loadShopOrder(id);
  // Keyed by revision: after an action the panel starts again from the saved order.
  return <OrderDetail key={order.revision} order={order} />;
}
