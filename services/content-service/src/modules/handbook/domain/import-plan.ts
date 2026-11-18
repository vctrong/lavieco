import { randomUUID } from "node:crypto";

import { DomainError } from "@lavieco/shared";
import { HANDBOOK_LIMITS, type HandbookImportMode } from "@lavieco/shared/content";

import {
  newPageKey,
  textIsMissing,
  type PageImage,
  type PageRecord,
  type VersionContent,
} from "./handbook";

/** One page produced by an import: a stored image and the text found in it. */
export type ImportedPage = {
  image: PageImage;
  /** Empty when nothing was found (outlined text, scanned page, plain image). */
  text: string;
};

export type ImportTarget = { mode: HandbookImportMode; pageId?: string; chapterId?: string };

const textOf = (imported: ImportedPage) =>
  imported.text.trim().length > 0
    ? { text: imported.text.trim(), textSource: "pdf" as const }
    : { text: "", textSource: "none" as const };

/**
 * Keeps what the editor typed when the new file has no text for this page, so a
 * re-upload never wipes hand-written text (risks: outlined fonts in the PDF).
 */
function mergedText(previous: PageRecord, imported: ImportedPage) {
  const found = textOf(imported);
  if (!textIsMissing(found.text)) return found;
  return previous.textSource === "manual"
    ? { text: previous.text, textSource: "manual" as const }
    : found;
}

function newPage(imported: ImportedPage, chapterId: string, number: number): PageRecord {
  return {
    id: randomUUID(),
    key: newPageKey(),
    chapterId,
    title: `Trang ${number}`,
    alt: "",
    image: imported.image,
    ...textOf(imported),
    hotspots: [],
  };
}

/**
 * Lands imported pages in the draft:
 * - `append`: new pages at the end of a chapter (the last one by default);
 * - `replace_all`: a new edition of the whole book. Page N keeps the id, address,
 *   chapter, title and hotspots of the old page N and takes the new image and text;
 *   extra pages are appended to the last chapter, missing ones are removed;
 * - `replace_page`: one page gets a new image (and text when the file has some).
 */
export function applyImport(
  content: VersionContent,
  target: ImportTarget,
  imported: readonly ImportedPage[],
): VersionContent {
  const lastChapter = content.chapters[content.chapters.length - 1];
  if (!lastChapter) throw new DomainError("handbook.structure_invalid");

  if (target.mode === "cover_front" || target.mode === "cover_back") {
    const cover = imported[0];
    if (!cover || imported.length !== 1) throw new DomainError("handbook.structure_invalid");
    const side = target.mode === "cover_front" ? "front" : "back";
    return { ...content, covers: { ...content.covers, [side]: cover.image } };
  }

  if (target.mode === "replace_page") {
    const index = content.pages.findIndex((page) => page.id === target.pageId);
    const replacement = imported[0];
    if (index < 0 || !replacement || imported.length !== 1) {
      throw new DomainError("handbook.page_unknown");
    }
    const pages = [...content.pages];
    const previous = pages[index]!;
    pages[index] = { ...previous, image: replacement.image, ...mergedText(previous, replacement) };
    return { ...content, pages };
  }

  if (target.mode === "append") {
    const chapterId = target.chapterId ?? lastChapter.id;
    if (!content.chapters.some((chapter) => chapter.id === chapterId)) {
      throw new DomainError("handbook.structure_invalid");
    }
    if (content.pages.length + imported.length > HANDBOOK_LIMITS.pagesMax) {
      throw new DomainError("handbook.structure_invalid", "too_many_pages");
    }
    // New pages go right after the chapter's last page, keeping chapters contiguous.
    let insertAt = content.pages.length;
    for (let i = content.pages.length - 1; i >= 0; i -= 1) {
      if (content.pages[i]!.chapterId === chapterId) {
        insertAt = i + 1;
        break;
      }
    }
    const added = imported.map((page, i) => newPage(page, chapterId, insertAt + i + 1));
    const pages = [...content.pages.slice(0, insertAt), ...added, ...content.pages.slice(insertAt)];
    return { ...content, pages };
  }

  if (imported.length > HANDBOOK_LIMITS.pagesMax) {
    throw new DomainError("handbook.structure_invalid", "too_many_pages");
  }
  const pages = imported.map((page, i) => {
    const previous = content.pages[i];
    if (!previous) return newPage(page, lastChapter.id, i + 1);
    return { ...previous, image: page.image, ...mergedText(previous, page) };
  });
  const ids = new Set(pages.map((page) => page.id));
  return {
    ...content,
    pages: pages.map((page) => ({
      ...page,
      hotspots: page.hotspots.filter(
        (spot) => spot.target.type !== "page" || ids.has(spot.target.pageId),
      ),
    })),
  };
}
