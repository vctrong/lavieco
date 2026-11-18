import { describe, expect, it } from "vitest";

import type { PublicHandbook } from "@lavieco/shared/content";

import {
  chapterTabLabels,
  mainFace,
  parseLocation,
  singleFaces,
  spreadAt,
  spreadCount,
  spreadOf,
  spreadSlots,
} from "./book-faces";

const cover = { publicId: "c", width: 100, height: 141 };
const pages = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    key: `k${i + 1}`.padEnd(8, "a"),
    number: i + 1,
    chapterId: "c1",
    title: `Trang ${i + 1}`,
    alt: "",
    image: { publicId: `p${i + 1}`, width: 100, height: 141 },
    hasText: true,
    hotspots: [],
  }));
const book = (n: number, front = true, back = true): Pick<PublicHandbook, "covers" | "pages"> => ({
  covers: { front: front ? cover : null, back: back ? cover : null },
  pages: pages(n),
});

const ids = (slots: ReturnType<typeof spreadSlots>, k: number) => {
  const s = spreadAt(slots, k);
  const id = (slot: (typeof s)["left"]) =>
    slot === undefined ? "·" : slot === null ? "_" : slot.id;
  return `${id(s.left)}|${id(s.right)}`;
};

describe("book faces", () => {
  it("opens on the front cover, keeps odd pages on the right and the back cover on the left", () => {
    const slots = spreadSlots(book(4));
    expect(Array.from({ length: spreadCount(slots) }, (_, k) => ids(slots, k))).toEqual([
      "·|cover-front",
      "_|p1",
      "p2|p3",
      "p4|_",
      "cover-back|·",
    ]);
  });

  it("closes an odd book without a blank page before the back cover", () => {
    const slots = spreadSlots(book(3));
    expect(Array.from({ length: spreadCount(slots) }, (_, k) => ids(slots, k))).toEqual([
      "·|cover-front",
      "_|p1",
      "p2|p3",
      "cover-back|·",
    ]);
  });

  it("without covers, page 1 opens alone on the right as before", () => {
    const slots = spreadSlots(book(3, false, false));
    expect(ids(slots, 0)).toBe("·|p1");
    expect(ids(slots, 1)).toBe("p2|p3");
    expect(spreadOf(slots, "p3")).toBe(1);
  });

  it("lists faces one by one for phones and finds the main face of a spread", () => {
    expect(singleFaces(book(2)).map((f) => f.id)).toEqual([
      "cover-front",
      "p1",
      "p2",
      "cover-back",
    ]);
    const slots = spreadSlots(book(4));
    expect(mainFace(spreadAt(slots, 1))?.id).toBe("p1");
    expect(mainFace(spreadAt(slots, 4))?.id).toBe("cover-back");
  });

  it("reads ?trang= as a page number or a cover, page numbers ignoring covers", () => {
    expect(parseLocation("3", book(4))).toBe("p3");
    expect(parseLocation("bia", book(4))).toBe("cover-front");
    expect(parseLocation("bia-sau", book(4))).toBe("cover-back");
    expect(parseLocation(undefined, book(4))).toBe("cover-front");
    expect(parseLocation(undefined, book(4, false))).toBe("p1");
    expect(parseLocation("99", book(4))).toBe("p4");
  });

  it("labels chapter tabs by kind", () => {
    const chapter = (id: string, kind: "front_matter" | "content" | "appendix") => ({
      id,
      slug: id,
      title: id,
      tint: "mint" as const,
      kind,
      firstPage: 1,
      pageCount: 1,
    });
    const labels = chapterTabLabels([
      chapter("a", "front_matter"),
      chapter("b", "content"),
      chapter("c", "content"),
      chapter("d", "appendix"),
    ]);
    expect([...labels.values()]).toEqual(["MĐ", "01", "02", "PL"]);
  });
});
