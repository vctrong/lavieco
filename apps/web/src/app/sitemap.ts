import type { MetadataRoute } from "next";

import { handbookSitemap, loadBook } from "@/features/handbook";
import { siteUrl } from "@/lib/site-url";

/**
 * Built per request from the cached book (tag `content:handbook`, revalidated on publish):
 * the build never calls content-service, which CI and Docker builds cannot reach.
 */
export const dynamic = "force-dynamic";

/** Public pages worth indexing. Handbook pages come from the published version. */
const STATIC_PATHS = ["/", "/chuong-trinh", "/bo-suu-tap", "/laviagent"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const book = await loadBook();
  return [
    ...STATIC_PATHS.map((path) => ({
      url: siteUrl(path).toString(),
      changeFrequency: "weekly" as const,
    })),
    ...(book.status === "ok" ? handbookSitemap(book.book) : []),
  ];
}
