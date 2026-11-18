import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadingPage, loadPage, pageMetadata } from "@/features/handbook";

/** Rendered per request from the cached page (tag `content:handbook`). */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/cam-nang/trang/[key]">): Promise<Metadata> {
  const result = await loadPage((await params).key);
  return result.status === "ok" ? pageMetadata(result.detail) : {};
}

/** One handbook page as text and image: SEO, sharing, reading mode (ADR-0029). */
export default async function HandbookPageRoute({ params }: PageProps<"/cam-nang/trang/[key]">) {
  const result = await loadPage((await params).key);
  if (result.status === "not_found") notFound();
  if (result.status === "error") throw new Error("handbook page unavailable");
  return <ReadingPage detail={result.detail} />;
}
