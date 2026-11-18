"use client";

import type { PublicHandbook, PublicHandbookPage } from "@lavieco/shared/content";

import { HandbookReader } from "./reader/handbook-reader";

/** "Hỏi LaviAgent về trang này": the page key travels, never its text (ADR-0029). */
const agentHref = (page: PublicHandbookPage) => `/laviagent?cam-nang=${page.key}`;

/** The reading screen with everything the published book offers. */
export function HandbookReaderScreen({
  book,
  initialPage,
}: {
  book: PublicHandbook;
  initialPage: number;
}) {
  return <HandbookReader book={book} initialPage={initialPage} extras={{ agentHref }} />;
}

/** The draft in preview: same reader, nothing remembered, no address changes. */
export function HandbookPreviewScreen({ book }: { book: PublicHandbook }) {
  return <HandbookReader book={book} initialPage={1} preview />;
}
