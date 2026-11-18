import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  COVER_HREF,
  HANDBOOK_TEXT,
  HandbookReaderScreen,
  loadBook,
  parseLocation,
} from "@/features/handbook";

/**
 * Rendered per request from the cached book (tag `content:handbook`): the build never
 * calls content-service (CI and Docker builds have no service environment).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PageProps<"/cam-nang/doc">): Promise<Metadata> {
  const result = await loadBook();
  const location =
    result.status === "ok" ? parseLocation((await searchParams).trang, result.book) : "";
  // Covers carry no page number: the plain book title.
  const page = /^p(d+)$/.exec(location)?.[1];
  return {
    title: page ? HANDBOOK_TEXT.vi.meta.readerTitle(Number(page)) : HANDBOOK_TEXT.vi.meta.title,
    // The reader is an app screen; each page has its own indexable address.
    robots: { index: false, follow: true },
  };
}

export default async function HandbookReaderRoute({ searchParams }: PageProps<"/cam-nang/doc">) {
  const result = await loadBook();
  if (result.status !== "ok") redirect(COVER_HREF);
  const location = parseLocation((await searchParams).trang, result.book);
  return <HandbookReaderScreen book={result.book} initialLocation={location} />;
}
