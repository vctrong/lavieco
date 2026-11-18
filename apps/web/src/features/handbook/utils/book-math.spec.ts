import { describe, expect, it } from "vitest";

import {
  chapterOfPage,
  pagesOfSpread,
  parsePage,
  progressOf,
  spreadCount,
  spreadIndexOf,
} from "./book-math";

describe("book math", () => {
  it("opens the cover alone on the right, then even/odd pairs", () => {
    expect(pagesOfSpread(0, 48)).toEqual({ left: null, right: 1 });
    expect(pagesOfSpread(6, 48)).toEqual({ left: 12, right: 13 });
    expect(pagesOfSpread(24, 48)).toEqual({ left: 48, right: null });
    expect(spreadCount(48)).toBe(25);
    expect(spreadCount(49)).toBe(25);
  });

  it("finds the spread of a page both ways", () => {
    expect(spreadIndexOf(1)).toBe(0);
    expect(spreadIndexOf(12)).toBe(6);
    expect(spreadIndexOf(13)).toBe(6);
  });

  it("reads ?trang= safely", () => {
    expect(parsePage("12", 48)).toBe(12);
    expect(parsePage("999", 48)).toBe(48);
    expect(parsePage("abc", 48)).toBe(1);
    expect(parsePage(["3", "4"], 48)).toBe(3);
    expect(parsePage(undefined, 48)).toBe(1);
  });

  it("finds the chapter of a page and the progress", () => {
    const chapters = [
      { id: "a", slug: "a", title: "A", tint: "mint" as const, firstPage: 1, pageCount: 8 },
      { id: "b", slug: "b", title: "B", tint: "canary" as const, firstPage: 9, pageCount: 6 },
    ];
    expect(chapterOfPage(chapters, 9)?.id).toBe("b");
    expect(chapterOfPage(chapters, 20)).toBeNull();
    expect(progressOf(1, 48)).toBe(0);
    expect(progressOf(48, 48)).toBe(1);
  });
});
