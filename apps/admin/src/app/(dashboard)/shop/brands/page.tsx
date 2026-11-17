import type { Metadata } from "next";

import { BrandsPage, SHOP_TEXT, loadCatalogChoices } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.brands.meta };

export default async function BrandsRoute() {
  const { brands } = await loadCatalogChoices("/shop/brands");
  return <BrandsPage brands={brands} />;
}
