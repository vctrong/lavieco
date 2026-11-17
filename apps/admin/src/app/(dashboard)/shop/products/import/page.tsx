import type { Metadata } from "next";

import { ImportWizard, SHOP_TEXT } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.import.meta };

export default function ImportProductsRoute() {
  return <ImportWizard />;
}
