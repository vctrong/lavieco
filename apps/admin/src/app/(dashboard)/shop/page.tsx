import type { Metadata } from "next";

import { SHOP_TEXT, ShopComingSoon } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.title };

export default function ShopRoute() {
  return <ShopComingSoon />;
}
