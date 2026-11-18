import { describe, expect, it } from "vitest";

import {
  addChapter,
  canRemoveChapter,
  movePageTo,
  pageNumbers,
  removeChapter,
  removePage,
  reorderChapters,
  reorderPages,
  toStructureUpdate,
  type StructureState,
} from "./structure";

const state = (): StructureState => ({
  title: "Cẩm nang",
  description: "",
  chapters: [
    { id: "c1", title: "Làm quen", tint: "mint" },
    { id: "c2", title: "Tự tay làm", tint: "canary" },
  ],
  pagesByChapter: { c1: ["p1", "p2"], c2: ["p3"] },
});

describe("draft structure editing", () => {
  it("numbers pages in chapter order", () => {
    const moved = reorderChapters(state(), 1, 0);
    expect([...pageNumbers(moved).entries()]).toEqual([
      ["p3", 1],
      ["p1", 2],
      ["p2", 3],
    ]);
  });

  it("reorders pages inside a chapter and moves a page to another chapter", () => {
    const next = movePageTo(reorderPages(state(), "c1", 1, 0), "p2", "c2");
    expect(next.pagesByChapter).toEqual({ c1: ["p1"], c2: ["p3", "p2"] });
  });

  it("removes only empty chapters, never the last one", () => {
    const withEmpty = addChapter(state(), "c3", "Chương 3");
    expect(withEmpty.chapters[2]!.tint).toBe("paper");
    expect(canRemoveChapter(withEmpty, "c1")).toBe(false);
    expect(removeChapter(withEmpty, "c3").chapters).toHaveLength(2);
    const single = { ...state(), chapters: [state().chapters[0]!], pagesByChapter: { c1: [] } };
    expect(canRemoveChapter(single, "c1")).toBe(false);
  });

  it("sends pages grouped by chapter, without the removed ones", () => {
    const update = toStructureUpdate(removePage(state(), "p2"), 7);
    expect(update.revision).toBe(7);
    expect(update.pages).toEqual([
      { id: "p1", chapterId: "c1" },
      { id: "p3", chapterId: "c2" },
    ]);
  });
});
