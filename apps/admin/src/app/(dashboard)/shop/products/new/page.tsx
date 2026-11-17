import type { Metadata } from "next";

import { ProductEditor, SHOP_TEXT, loadCatalogChoices } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.editor.metaNew };

export default async function NewProductRoute() {
  const choices = await loadCatalogChoices("/shop/products/new");
  return <ProductEditor product={null} {...choices} />;
}
