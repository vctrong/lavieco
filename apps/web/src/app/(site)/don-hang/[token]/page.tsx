import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SHOP_TEXT, ShopOrderPage, getShopOrder } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.order.metaTitle, robots: { index: false } };

export default async function ShopOrderRoute({
  params,
  searchParams,
}: PageProps<"/don-hang/[token]">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const order = await getShopOrder(token);
  if (!order) notFound();
  return <ShopOrderPage token={token} order={order} fresh={query.moi === "1"} />;
}
