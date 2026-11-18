import {
  HANDBOOK_CHAPTER_KINDS,
  HANDBOOK_CHAPTER_TINTS,
  type HandbookChapterKind,
  type HandbookChapterTint,
  type HandbookStructureUpdate,
  type HandbookVersion,
} from "@lavieco/shared/content";

/**
 * Local editing of the draft's structure (chapters, page order) before "Lưu nháp".
 * Pages are one ordered list; each page names its chapter. Pages of a chapter are
 * kept together, in chapter order, whenever the structure is saved.
 */

export type ChapterDraft = {
  id: string;
  title: string;
  tint: HandbookChapterTint;
  kind: HandbookChapterKind;
};
export type StructureState = {
  title: string;
  description: string;
  chapters: ChapterDraft[];
  /** Page ids grouped by chapter id, in display order. */
  pagesByChapter: Record<string, string[]>;
  /** False once the editor removed that cover (saved with the structure). */
  keepCovers: { front: boolean; back: boolean };
};

const KIND_RANK = new Map(HANDBOOK_CHAPTER_KINDS.map((kind, index) => [kind, index]));

/** Front matter first, appendices last, editor order inside each kind (as the service does). */
function sortByKind(chapters: ChapterDraft[]): ChapterDraft[] {
  return chapters
    .map((chapter, index) => ({ chapter, index }))
    .sort(
      (a, b) =>
        (KIND_RANK.get(a.chapter.kind) ?? 1) - (KIND_RANK.get(b.chapter.kind) ?? 1) ||
        a.index - b.index,
    )
    .map(({ chapter }) => chapter);
}

export function structureOf(version: HandbookVersion): StructureState {
  const pagesByChapter: Record<string, string[]> = {};
  for (const chapter of version.chapters) pagesByChapter[chapter.id] = [];
  for (const page of version.pages) (pagesByChapter[page.chapterId] ??= []).push(page.id);
  return {
    title: version.title,
    description: version.description,
    chapters: version.chapters.map(({ id, title, tint, kind }) => ({ id, title, tint, kind })),
    pagesByChapter,
    keepCovers: { front: true, back: true },
  };
}

export function toStructureUpdate(
  state: StructureState,
  revision: number,
): HandbookStructureUpdate {
  return {
    revision,
    title: state.title,
    description: state.description,
    keepCovers: state.keepCovers,
    chapters: state.chapters,
    pages: state.chapters.flatMap((chapter) =>
      (state.pagesByChapter[chapter.id] ?? []).map((id) => ({ id, chapterId: chapter.id })),
    ),
  };
}

export function sameStructure(a: StructureState, b: StructureState): boolean {
  return JSON.stringify(toStructureUpdate(a, 1)) === JSON.stringify(toStructureUpdate(b, 1));
}

/** Page numbers as the reader will see them (1-based, in chapter order). */
export function pageNumbers(state: StructureState): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const chapter of state.chapters) {
    for (const id of state.pagesByChapter[chapter.id] ?? []) numbers.set(id, (n += 1));
  }
  return numbers;
}

export function addChapter(state: StructureState, id: string, title: string): StructureState {
  const tint = HANDBOOK_CHAPTER_TINTS[state.chapters.length % HANDBOOK_CHAPTER_TINTS.length]!;
  return {
    ...state,
    chapters: sortByKind([...state.chapters, { id, title, tint, kind: "content" }]),
    pagesByChapter: { ...state.pagesByChapter, [id]: [] },
  };
}

export function updateChapter(
  state: StructureState,
  id: string,
  change: Partial<Omit<ChapterDraft, "id">>,
): StructureState {
  return {
    ...state,
    chapters: sortByKind(
      state.chapters.map((chapter) => (chapter.id === id ? { ...chapter, ...change } : chapter)),
    ),
  };
}

/** Only an empty chapter can go (and never the last one). */
export function canRemoveChapter(state: StructureState, id: string): boolean {
  return state.chapters.length > 1 && (state.pagesByChapter[id]?.length ?? 0) === 0;
}

export function removeChapter(state: StructureState, id: string): StructureState {
  if (!canRemoveChapter(state, id)) return state;
  const pagesByChapter = { ...state.pagesByChapter };
  delete pagesByChapter[id];
  return {
    ...state,
    chapters: state.chapters.filter((chapter) => chapter.id !== id),
    pagesByChapter,
  };
}

export function reorderChapters(state: StructureState, from: number, to: number): StructureState {
  const chapters = [...state.chapters];
  const [moved] = chapters.splice(from, 1);
  if (!moved) return state;
  chapters.splice(to, 0, moved);
  // A chapter cannot leave its kind's place: front matter first, appendices last.
  return { ...state, chapters: sortByKind(chapters) };
}

export function reorderPages(
  state: StructureState,
  chapterId: string,
  from: number,
  to: number,
): StructureState {
  const pages = [...(state.pagesByChapter[chapterId] ?? [])];
  const [moved] = pages.splice(from, 1);
  if (!moved) return state;
  pages.splice(to, 0, moved);
  return { ...state, pagesByChapter: { ...state.pagesByChapter, [chapterId]: pages } };
}

/** Moves a page to the end of another chapter. */
export function movePageTo(
  state: StructureState,
  pageId: string,
  chapterId: string,
): StructureState {
  const pagesByChapter: Record<string, string[]> = {};
  for (const [id, pages] of Object.entries(state.pagesByChapter)) {
    pagesByChapter[id] = pages.filter((page) => page !== pageId);
  }
  pagesByChapter[chapterId] = [...(pagesByChapter[chapterId] ?? []), pageId];
  return { ...state, pagesByChapter };
}

export function removePage(state: StructureState, pageId: string): StructureState {
  const pagesByChapter: Record<string, string[]> = {};
  for (const [id, pages] of Object.entries(state.pagesByChapter)) {
    pagesByChapter[id] = pages.filter((page) => page !== pageId);
  }
  return { ...state, pagesByChapter };
}

/** Removes a cover when the structure is saved ("Gỡ bìa"). */
export function removeCover(state: StructureState, side: "front" | "back"): StructureState {
  return { ...state, keepCovers: { ...state.keepCovers, [side]: false } };
}
