import type { Metadata } from "next";

import { ProductEditor, loadCatalogChoices, loadProduct } from "@/features/shop";

export async function generateMetadata({
  params,
}: PageProps<"/shop/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  return { title: product.title };
}

export default async function ProductRoute({ params }: PageProps<"/shop/products/[id]">) {
  const { id } = await params;
  const [product, choices] = await Promise.all([
    loadProduct(id),
    loadCatalogChoices(`/shop/products/${id}`),
  ]);
  // Keyed by revision: after a save the form starts again from the saved product.
  return <ProductEditor key={product.revision} product={product} {...choices} />;
}
