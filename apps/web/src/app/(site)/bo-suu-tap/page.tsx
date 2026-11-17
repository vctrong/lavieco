import type { Metadata } from "next";

import {
  CollectionPage,
  SHOP_TEXT,
  loadCategories,
  loadCollection,
  toFilters,
} from "@/features/shop";

export const metadata: Metadata = {
  title: SHOP_TEXT.vi.collection.metaTitle,
  description: SHOP_TEXT.vi.collection.metaDescription,
  alternates: { canonical: "/bo-suu-tap" },
};

export default async function CollectionRoute({ searchParams }: PageProps<"/bo-suu-tap">) {
  const filters = toFilters(await searchParams);
  const [result, categories] = await Promise.all([loadCollection(filters), loadCategories()]);
  return <CollectionPage result={result} categories={categories} filters={filters} />;
}
