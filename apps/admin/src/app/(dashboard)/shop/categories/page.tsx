import type { Metadata } from "next";

import { CategoriesPage, SHOP_TEXT, loadCatalogChoices } from "@/features/shop";

export const metadata: Metadata = { title: SHOP_TEXT.vi.categories.meta };

export default async function CategoriesRoute() {
  const { categories } = await loadCatalogChoices("/shop/categories");
  return <CategoriesPage categories={categories} />;
}
