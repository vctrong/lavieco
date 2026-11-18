import { describe, expect, it } from "vitest";

import {
  addChapter,
  canRemoveChapter,
  movePageTo,
  pageNumbers,
  removeChapter,
  removeCover,
  removePage,
  reorderChapters,
  updateChapter,
  reorderPages,
  toStructureUpdate,
  type StructureState,
} from "./structure";

const state = (): StructureState => ({
  title: "Cẩm nang",
  description: "",
  chapters: [
    { id: "c1", title: "Làm quen", tint: "mint", kind: "content" },
    { id: "c2", title: "Tự tay làm", tint: "canary", kind: "content" },
  ],
  pagesByChapter: { c1: ["p1", "p2"], c2: ["p3"] },
  keepCovers: { front: true, back: true },
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

  it("keeps front matter first and appendices last, whatever the drag", () => {
    const appendix = updateChapter(state(), "c1", { kind: "appendix" });
    expect(appendix.chapters.map((c) => c.id)).toEqual(["c2", "c1"]);
    expect([...pageNumbers(appendix).keys()]).toEqual(["p3", "p1", "p2"]);
    // Dragging the appendix back to the top does not move it out of the appendix place.
    expect(reorderChapters(appendix, 1, 0).chapters.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("sends a removed cover with the structure", () => {
    expect(toStructureUpdate(removeCover(state(), "back"), 1).keepCovers).toEqual({
      front: true,
      back: false,
    });
  });
});
