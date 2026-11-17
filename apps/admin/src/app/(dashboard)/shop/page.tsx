import type { Metadata } from "next";

import { SHOP_TEXT, ShopOverview, loadShopOverview } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.title };

export default async function ShopRoute() {
  return <ShopOverview stats={await loadShopOverview()} />;
}
