import type { Metadata } from "next";

import { ComingSoonSection, comingSoonPageMetadata } from "@/features/coming-soon";
import { HANDBOOK_TEXT, HandbookCover, loadBook } from "@/features/handbook";

/**
 * Rendered per request from the cached book (tag `content:handbook`): a build without
 * content-service must not freeze a "sắp ra mắt" page for an hour.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadBook();
  if (result.status !== "ok") return comingSoonPageMetadata("handbook");
  return {
    title: result.book.title,
    description: result.book.description || HANDBOOK_TEXT.vi.meta.description,
    alternates: { canonical: "/cam-nang" },
  };
}

/** Cover of the handbook; "sắp ra mắt" until a version is published (ADR-0029). */
export default async function CamNangPage() {
  const result = await loadBook();
  if (result.status !== "ok") return <ComingSoonSection page="handbook" />;
  return <HandbookCover book={result.book} />;
}
