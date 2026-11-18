import type {
  PublicHandbook,
  PublicHandbookChapter,
  PublicHandbookCover,
  PublicHandbookPage,
} from "@lavieco/shared/content";

/**
 * What the open book shows, face by face (ADR-0029). The front cover, the numbered
 * pages, the back cover; covers carry no page number. Opened flat, the book behaves
 * like a real one:
 *
 *   [ · | front ]  [ inside | 1 ]  [ 2 | 3 ] … [ n | inside ]  [ back | · ]
 *
 * `·` is nothing (the closed side of the book), `inside` is blank paper (the inside of
 * a cover). Without a front cover, page 1 opens alone on the right as before.
 */

export type CoverSide = "front" | "back";

export type Face =
  | { type: "page"; id: string; page: PublicHandbookPage }
  | { type: "cover"; id: `cover-${CoverSide}`; side: CoverSide; image: PublicHandbookCover };

/** A face, blank paper (`null`), or nothing at all (`undefined`). */
export type Slot = Face | null | undefined;

export const FRONT_COVER_ID = "cover-front";
export const BACK_COVER_ID = "cover-back";
export const pageFaceId = (number: number) => `p${number}`;

/** `?trang=` values of the covers. */
export const COVER_PARAMS = { front: "bia", back: "bia-sau" } as const;

function coverFace(side: CoverSide, image: PublicHandbookCover | null): Face | null {
  return image ? { type: "cover", id: `cover-${side}`, side, image } : null;
}

/** One face after another (one-page layout): front cover, pages, back cover. */
export function singleFaces(book: Pick<PublicHandbook, "covers" | "pages">): Face[] {
  const front = coverFace("front", book.covers.front);
  const back = coverFace("back", book.covers.back);
  const pages: Face[] = book.pages.map((page) => ({
    type: "page",
    id: pageFaceId(page.number),
    page,
  }));
  return [...(front ? [front] : []), ...pages, ...(back ? [back] : [])];
}

/**
 * Faces laid out for the two-page layout: slot 0 opens alone on the right, then slots
 * go in pairs (left = odd index, right = even index). Blank paper keeps page 1 on the
 * right after a cover, and the back cover on the left.
 */
export function spreadSlots(book: Pick<PublicHandbook, "covers" | "pages">): Slot[] {
  const slots: Slot[] = [];
  const front = coverFace("front", book.covers.front);
  if (front) slots.push(front, null);
  for (const page of book.pages) {
    slots.push({ type: "page", id: pageFaceId(page.number), page });
  }
  const back = coverFace("back", book.covers.back);
  if (back) {
    // The back cover must land on a left (odd) slot.
    if (slots.length % 2 === 0) slots.push(null);
    slots.push(back);
  }
  return slots;
}

export function spreadCount(slots: readonly Slot[]): number {
  return slots.length === 0 ? 0 : 1 + Math.ceil((slots.length - 1) / 2);
}

export type Spread = { left: Slot; right: Slot };

export function spreadAt(slots: readonly Slot[], index: number): Spread {
  if (index <= 0) return { left: undefined, right: slots[0] };
  return { left: slots[2 * index - 1], right: slots[2 * index] };
}

/** Spread showing a face; 0 when the face is unknown. */
export function spreadOf(slots: readonly Slot[], faceId: string): number {
  const at = slots.findIndex((slot) => slot?.id === faceId);
  return at <= 0 ? 0 : Math.ceil(at / 2);
}

/** The face a spread is "at" (address bar, page counter): its first page, else a cover. */
export function mainFace(spread: Spread): Face | null {
  const faces = [spread.left, spread.right].filter((slot): slot is Face => Boolean(slot));
  return faces.find((face) => face.type === "page") ?? faces[0] ?? null;
}

/** `?trang=` → face id: a page number, "bia" or "bia-sau"; anything else → the first face. */
export function parseLocation(
  value: string | string[] | undefined,
  book: Pick<PublicHandbook, "covers" | "pages">,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const faces = singleFaces(book);
  const first = faces[0]?.id ?? pageFaceId(1);
  if (raw === COVER_PARAMS.front && book.covers.front) return FRONT_COVER_ID;
  if (raw === COVER_PARAMS.back && book.covers.back) return BACK_COVER_ID;
  const number = Number(raw);
  if (!raw || !Number.isInteger(number) || number < 1) return first;
  return pageFaceId(Math.min(number, Math.max(1, book.pages.length)));
}

/** `?trang=` value of a face. */
export function locationParam(face: Face): string {
  return face.type === "cover" ? COVER_PARAMS[face.side] : String(face.page.number);
}

/**
 * Number of each chapter within its kind: content chapters 1, 2…; appendices 1, 2…
 * only when there are several (0 for a single appendix); front matter 0.
 */
export function chapterOrdinals(chapters: readonly PublicHandbookChapter[]): Map<string, number> {
  const ordinals = new Map<string, number>();
  const appendices = chapters.filter((chapter) => chapter.kind === "appendix").length;
  let content = 0;
  let appendix = 0;
  for (const chapter of chapters) {
    if (chapter.kind === "front_matter") ordinals.set(chapter.id, 0);
    else if (chapter.kind === "appendix") {
      appendix += 1;
      ordinals.set(chapter.id, appendices > 1 ? appendix : 0);
    } else {
      content += 1;
      ordinals.set(chapter.id, content);
    }
  }
  return ordinals;
}

/**
 * Short tab label of a chapter: content chapters are numbered 01, 02…; front matter
 * is "MĐ" and appendices "PL" (numbered when there are several).
 */
export function chapterTabLabels(chapters: readonly PublicHandbookChapter[]): Map<string, string> {
  const ordinals = chapterOrdinals(chapters);
  const labels = new Map<string, string>();
  for (const chapter of chapters) {
    const n = ordinals.get(chapter.id) ?? 0;
    labels.set(
      chapter.id,
      chapter.kind === "front_matter"
        ? "MĐ"
        : chapter.kind === "appendix"
          ? `PL${n > 0 ? n : ""}`
          : String(n).padStart(2, "0"),
    );
  }
  return labels;
}

/** Full name of a chapter's place in the book: "Chương 2", "Mở đầu", "Phụ lục". */
export function chapterKindName(
  chapter: Pick<PublicHandbookChapter, "kind">,
  ordinal: number,
  names: {
    content: (n: number) => string;
    front_matter: string;
    appendix: (n: number) => string;
  },
): string {
  if (chapter.kind === "front_matter") return names.front_matter;
  return chapter.kind === "appendix" ? names.appendix(ordinal) : names.content(ordinal);
}
