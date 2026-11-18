import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HANDBOOK_TEXT, HandbookPreviewScreen, loadPreview } from "@/features/handbook";

export const metadata: Metadata = {
  title: HANDBOOK_TEXT.vi.meta.previewTitle,
  robots: { index: false, follow: false },
};

/** Never cached: the token decides, and it expires after 10 minutes. */
export const dynamic = "force-dynamic";

export default async function HandbookPreviewRoute({
  params,
}: PageProps<"/xem-truoc/cam-nang/[token]">) {
  const book = await loadPreview((await params).token);
  if (!book) notFound();
  return <HandbookPreviewScreen book={book} />;
}
