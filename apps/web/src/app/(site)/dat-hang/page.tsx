import type { Metadata } from "next";

import { CheckoutPage, SHOP_TEXT, getCheckoutPrefill, loadShopSettings } from "@/features/shop";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.checkout.metaTitle,
  robots: { index: false },
};

export default async function CheckoutRoute() {
  const [settings, prefill] = await Promise.all([loadShopSettings(), getCheckoutPrefill()]);
  return (
    <CheckoutPage settings={settings} prefill={prefill} turnstileSiteKey={turnstileSiteKey()} />
  );
}
