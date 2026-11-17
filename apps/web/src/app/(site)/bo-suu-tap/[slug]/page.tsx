import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductPage, loadProduct, loadShopSettings } from "@/features/shop";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: PageProps<"/bo-suu-tap/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};
  return {
    title: product.seo.title || product.title,
    description: product.seo.description || product.summary,
    alternates: { canonical: `/bo-suu-tap/${product.slug}` },
  };
}

export default async function ProductRoute({ params }: PageProps<"/bo-suu-tap/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([loadProduct(slug), loadShopSettings()]);
  if (!product) notFound();
  // A former slug (renamed product) moves to the current one.
  if (product.slug !== slug) permanentRedirect(`/bo-suu-tap/${product.slug}`);
  return (
    <ProductPage
      product={product}
      settings={settings}
      url={siteUrl(`/bo-suu-tap/${product.slug}`).toString()}
    />
  );
}
