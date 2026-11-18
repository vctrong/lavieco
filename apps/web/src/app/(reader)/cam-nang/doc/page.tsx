import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  COVER_HREF,
  HANDBOOK_TEXT,
  HandbookReaderScreen,
  loadBook,
  parsePage,
} from "@/features/handbook";

export async function generateMetadata({
  searchParams,
}: PageProps<"/cam-nang/doc">): Promise<Metadata> {
  const result = await loadBook();
  const total = result.status === "ok" ? result.book.pages.length : 1;
  return {
    title: HANDBOOK_TEXT.vi.meta.readerTitle(parsePage((await searchParams).trang, total)),
    // The reader is an app screen; each page has its own indexable address.
    robots: { index: false, follow: true },
  };
}

export default async function HandbookReaderRoute({ searchParams }: PageProps<"/cam-nang/doc">) {
  const result = await loadBook();
  if (result.status !== "ok") redirect(COVER_HREF);
  const page = parsePage((await searchParams).trang, result.book.pages.length);
  return <HandbookReaderScreen book={result.book} initialPage={page} />;
}
