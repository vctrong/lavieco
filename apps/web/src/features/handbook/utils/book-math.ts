import type { PublicHandbookChapter } from "@lavieco/shared/content";

/** Chapter holding a page (pages are numbered from 1; covers carry no number). */
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
