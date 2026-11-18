import "server-only";

import { unstable_cache } from "next/cache";

import { isServiceProblem } from "@lavieco/api-clients";
import {
  HANDBOOK_CACHE_TAG,
  type PublicHandbook,
  type PublicHandbookPageDetail,
} from "@lavieco/shared/content";

import { contentClient, webLogger } from "@/lib/services";

/** Fallback lifetime; a publish revalidates `content:handbook` at once (ADR-0029). */
const CACHE_SECONDS = 3600;

export type BookResult =
  { status: "ok"; book: PublicHandbook } | { status: "not_published" } | { status: "error" };

export type PageResult =
  | { status: "ok"; detail: PublicHandbookPageDetail }
  | { status: "not_found" }
  | { status: "error" };

const cachedBook = unstable_cache(() => contentClient().getPublishedHandbook(), ["handbook-book"], {
  tags: [HANDBOOK_CACHE_TAG],
  revalidate: CACHE_SECONDS,
});

const cachedPage = unstable_cache(
  (key: string) => contentClient().getPublishedHandbookPage(key),
  ["handbook-page"],
  { tags: [HANDBOOK_CACHE_TAG], revalidate: CACHE_SECONDS },
);

/** The published book (chapters and pages, no text). Never throws. */
export async function loadBook(): Promise<BookResult> {
  try {
    return { status: "ok", book: await cachedBook() };
  } catch (error) {
    if (isServiceProblem(error) && error.status === 404) return { status: "not_published" };
    webLogger().warn("handbook load failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return { status: "error" };
  }
}

/** One published page with its text (reading mode, SEO, LaviAgent). Never throws. */
export async function loadPage(key: string): Promise<PageResult> {
  if (!/^[0-9a-hjkmnp-tv-z]{8}$/.test(key)) return { status: "not_found" };
  try {
    return { status: "ok", detail: await cachedPage(key) };
  } catch (error) {
    if (isServiceProblem(error) && error.status === 404) return { status: "not_found" };
    webLogger().warn("handbook page load failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return { status: "error" };
  }
}

/** The draft behind a 10-minute preview token; never cached. */
export async function loadPreview(token: string): Promise<PublicHandbook | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  try {
    return await contentClient().getHandbookPreview(token);
  } catch (error) {
    if (!(isServiceProblem(error) && error.status === 404)) {
      webLogger().warn("handbook preview failed", {
        errorCode: isServiceProblem(error) ? error.code : "unavailable",
      });
    }
    return null;
  }
}
