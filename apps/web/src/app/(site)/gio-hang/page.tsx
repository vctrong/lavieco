import type { Metadata } from "next";

import { CartPage, SHOP_TEXT, loadShopSettings } from "@/features/shop";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.cart.metaTitle,
  robots: { index: false },
};

export default async function CartRoute() {
  return <CartPage settings={await loadShopSettings()} />;
}
