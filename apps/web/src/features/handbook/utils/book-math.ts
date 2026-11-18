import type { PublicHandbookChapter } from "@lavieco/shared/content";

/**
 * Page arithmetic of the open book. Pages are numbered from 1. Opened flat, page 1
 * (the cover) sits alone on the right; then even pages on the left and odd pages on
 * the right: [–,1] [2,3] [4,5] … like a real book.
 */

export type Spread = { left: number | null; right: number | null };

export function spreadIndexOf(page: number): number {
  return page <= 1 ? 0 : Math.floor(page / 2);
}

export function spreadCount(total: number): number {
  return total <= 0 ? 0 : Math.floor(total / 2) + 1;
}

export function pagesOfSpread(index: number, total: number): Spread {
  if (index <= 0) return { left: null, right: total >= 1 ? 1 : null };
  const left = 2 * index;
  const right = left + 1;
  return { left: left <= total ? left : null, right: right <= total ? right : null };
}

/** The page shown first when a spread opens (for the address bar and "đang đọc"). */
export function firstPageOf(spread: Spread): number {
  return spread.left ?? spread.right ?? 1;
}

/** `?trang=` from the address bar, clamped to the book; anything odd means page 1. */
export function parsePage(value: string | string[] | undefined, total: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, Math.max(1, total));
}

export function chapterOfPage(
  chapters: readonly PublicHandbookChapter[],
  page: number,
): PublicHandbookChapter | null {
  return (
    chapters.find(
      (chapter) => page >= chapter.firstPage && page < chapter.firstPage + chapter.pageCount,
    ) ?? null
  );
}

/** Share of the book read, 0 to 1. */
export function progressOf(page: number, total: number): number {
  return total <= 1 ? 1 : (page - 1) / (total - 1);
}
