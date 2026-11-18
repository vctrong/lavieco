import { randomBytes, randomUUID } from "node:crypto";

import { DomainError, toSlug } from "@lavieco/shared";
import {
  HANDBOOK_CHAPTER_TINTS,
  HANDBOOK_LIMITS,
  type HandbookAccessLevel,
  type HandbookActor,
  type HandbookChapterTint,
  type HandbookHotspot,
  type HandbookPageUpdate,
  type HandbookStructureUpdate,
  type HandbookTextSource,
  type HandbookVersionStatus,
} from "@lavieco/shared/content";

/**
 * Digital Green Handbook (ADR-0029). Pages are designed images; the book is versioned
 * as a whole. One `handbook_versions` document is a full snapshot: chapters and pages
 * with their text and hotspots. Page and chapter ids are stable across versions, so
 * bookmarks, hotspots and public addresses keep working after a re-upload.
 */

export type ChapterRecord = {
  id: string;
  slug: string;
  title: string;
  tint: HandbookChapterTint;
};

export type PageImage = { mediaId: string; publicId: string; width: number; height: number };

export type PageRecord = {
  id: string;
  key: string;
  chapterId: string;
  title: string;
  alt: string;
  image: PageImage;
  text: string;
  textSource: HandbookTextSource;
  hotspots: HandbookHotspot[];
};

export type VersionRecord = {
  id: string;
  handbookId: string;
  number: number;
  status: HandbookVersionStatus;
  title: string;
  description: string;
  note: string;
  basedOnNumber: number | null;
  revision: number;
  chapters: ChapterRecord[];
  pages: PageRecord[];
  createdBy: HandbookActor;
  createdAt: Date;
  updatedAt: Date;
  publishedBy: HandbookActor | null;
  publishedAt: Date | null;
};

export type HandbookRecord = {
  id: string;
  slug: string;
  accessLevel: HandbookAccessLevel;
  publishedVersionId: string | null;
  draftVersionId: string | null;
  /** Highest version number handed out; the next one is `lastNumber + 1`. */
  lastNumber: number;
  revision: number;
};

/** What a version's content is, without its identity and lifecycle. */
export type VersionContent = Pick<VersionRecord, "title" | "description" | "chapters" | "pages">;

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/** 8 random Crockford characters (40 bits): a page's public key, never reused. */
export function newPageKey(): string {
  const bytes = randomBytes(8);
  let key = "";
  for (const byte of bytes) key += CROCKFORD[byte & 31];
  return key;
}

export const DEFAULT_TITLE = "Cẩm nang Xanh số";

/** An empty book: one chapter, no pages. */
export function emptyContent(): VersionContent {
  return {
    title: DEFAULT_TITLE,
    description: "",
    chapters: [{ id: randomUUID(), slug: "chuong-1", title: "Chương 1", tint: "mint" }],
    pages: [],
  };
}

export function textIsMissing(text: string): boolean {
  return text.replace(/\s+/g, "").length < HANDBOOK_LIMITS.textMinChars;
}

/** Height/width further than the tolerance from √2 (A5 portrait). Warns, never blocks. */
export function aspectIsOff(width: number, height: number): boolean {
  const ratio = height / width;
  return (
    Math.abs(ratio - HANDBOOK_LIMITS.aspectRatio) / HANDBOOK_LIMITS.aspectRatio >
    HANDBOOK_LIMITS.aspectTolerance
  );
}

/** Share of pages with text; an empty book counts as fully covered. */
export function textRatio(pages: readonly Pick<PageRecord, "text">[]): number {
  if (pages.length === 0) return 1;
  return pages.filter((page) => !textIsMissing(page.text)).length / pages.length;
}

const uniqueSlug = (wanted: string, taken: Set<string>) => {
  const base = wanted || "chuong";
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
};

/**
 * Applies chapters and page order from the editor (drag and drop). Every page id must
 * exist in the draft and appear once; pages left out are removed. A chapter keeps its
 * slug unless one is given (product links point to chapter slugs).
 */
export function applyStructure(
  current: VersionContent,
  input: HandbookStructureUpdate,
): VersionContent {
  const chapterIds = new Set(input.chapters.map((chapter) => chapter.id));
  if (chapterIds.size !== input.chapters.length)
    throw new DomainError("handbook.structure_invalid");

  const existing = new Map(current.chapters.map((chapter) => [chapter.id, chapter]));
  const taken = new Set<string>();
  const chapters = input.chapters.map((chapter) => {
    const wanted = chapter.slug ?? existing.get(chapter.id)?.slug ?? toSlug(chapter.title);
    return {
      id: chapter.id,
      title: chapter.title,
      tint: chapter.tint,
      slug: uniqueSlug(wanted, taken),
    };
  });

  const pagesById = new Map(current.pages.map((page) => [page.id, page]));
  const seen = new Set<string>();
  const pages = input.pages.map(({ id, chapterId }) => {
    const page = pagesById.get(id);
    if (!page || seen.has(id) || !chapterIds.has(chapterId)) {
      throw new DomainError("handbook.structure_invalid");
    }
    seen.add(id);
    return { ...page, chapterId };
  });
  return {
    title: input.title,
    description: input.description,
    chapters,
    pages: dropDanglingPageLinks(pages),
  };
}

/** Hotspots that lead to a removed page would be dead links: they go with it. */
function dropDanglingPageLinks(pages: PageRecord[]): PageRecord[] {
  const ids = new Set(pages.map((page) => page.id));
  return pages.map((page) => ({
    ...page,
    hotspots: page.hotspots.filter(
      (spot) => spot.target.type !== "page" || ids.has(spot.target.pageId),
    ),
  }));
}

/** Title, alt, typed text and hotspots of one page. */
export function applyPageUpdate(
  current: VersionContent,
  pageId: string,
  input: HandbookPageUpdate,
): VersionContent {
  const index = current.pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new DomainError("handbook.page_unknown");
  const ids = new Set(current.pages.map((page) => page.id));
  for (const spot of input.hotspots) {
    if (spot.target.type === "page" && !ids.has(spot.target.pageId)) {
      throw new DomainError("handbook.structure_invalid");
    }
  }
  const page = current.pages[index]!;
  const text = input.text.trim();
  const textSource: HandbookTextSource =
    text === page.text.trim() ? page.textSource : text.length === 0 ? "none" : "manual";
  const pages = [...current.pages];
  pages[index] = {
    ...page,
    title: input.title,
    alt: input.alt,
    text,
    textSource,
    hotspots: input.hotspots,
  };
  return { ...current, pages };
}

/**
 * A draft can be published when it has pages and no chapter is empty (an empty
 * chapter would be a dead tab at the edge of the book).
 */
export function assertPublishable(content: VersionContent) {
  if (content.pages.length === 0) throw new DomainError("handbook.publish_blocked", "no_pages");
  const used = new Set(content.pages.map((page) => page.chapterId));
  if (content.chapters.some((chapter) => !used.has(chapter.id))) {
    throw new DomainError("handbook.publish_blocked", "empty_chapter");
  }
}

/** Warnings shown after publishing; they never block (D1, risks). */
export function publishWarnings(content: VersionContent): ("low_text_ratio" | "aspect_off")[] {
  const warnings: ("low_text_ratio" | "aspect_off")[] = [];
  if (textRatio(content.pages) < HANDBOOK_LIMITS.lowTextRatio) warnings.push("low_text_ratio");
  if (content.pages.some((page) => aspectIsOff(page.image.width, page.image.height))) {
    warnings.push("aspect_off");
  }
  return warnings;
}

/**
 * Versions whose images are kept: the published one, the draft, and the most recent
 * `keptVersions` archived ones. Older archived versions stay in the history but can
 * no longer be restored once their unused images are cleaned up. A discarded draft
 * (archived, never published) is never kept.
 */
export function keptVersionIds(
  versions: readonly Pick<VersionRecord, "id" | "number" | "status" | "publishedAt">[],
): Set<string> {
  const kept = new Set<string>();
  const archived = versions
    .filter((version) => version.status === "archived" && version.publishedAt !== null)
    .sort((a, b) => b.number - a.number)
    .slice(0, HANDBOOK_LIMITS.keptVersions);
  for (const version of versions) {
    if (version.status !== "archived") kept.add(version.id);
  }
  for (const version of archived) kept.add(version.id);
  return kept;
}

/** Media ids still needed: those of every kept version. */
export function mediaIdsInUse(versions: readonly Pick<VersionRecord, "pages">[]): Set<string> {
  const ids = new Set<string>();
  for (const version of versions) {
    for (const page of version.pages) ids.add(page.image.mediaId);
  }
  return ids;
}

/** Copy of an old version's content with fresh hotspot links kept as they were. */
export function copyContent(version: VersionContent): VersionContent {
  return structuredClone({
    title: version.title,
    description: version.description,
    chapters: version.chapters,
    pages: version.pages,
  });
}

/** Next tint for a new chapter, cycling through the palette. */
export function nextTint(count: number): HandbookChapterTint {
  return HANDBOOK_CHAPTER_TINTS[count % HANDBOOK_CHAPTER_TINTS.length]!;
}
