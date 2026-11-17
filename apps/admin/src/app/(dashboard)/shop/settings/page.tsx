import type { Metadata } from "next";

import { SHOP_TEXT, ShopSettingsPage, loadShopSettings } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.settings.meta };

export default async function ShopSettingsRoute() {
  const settings = await loadShopSettings();
  return <ShopSettingsPage settings={settings} />;
}
