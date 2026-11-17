import type { Metadata } from "next";

import { OrderLookupPage, SHOP_TEXT } from "@/features/shop";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.lookup.metaTitle,
  robots: { index: false },
};

export default function OrderLookupRoute() {
  return <OrderLookupPage />;
}
