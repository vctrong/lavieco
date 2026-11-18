import { describe, expect, it } from "vitest";

import { chapterOfPage } from "./book-math";

describe("book math", () => {
  it("finds the chapter of a page", () => {
    const chapter = (id: string, firstPage: number, pageCount: number) => ({
      id,
      slug: id,
      title: id,
      tint: "mint" as const,
      kind: "content" as const,
      firstPage,
      pageCount,
    });
    const chapters = [chapter("a", 1, 8), chapter("b", 9, 6)];
    expect(chapterOfPage(chapters, 9)?.id).toBe("b");
    expect(chapterOfPage(chapters, 20)).toBeNull();
  });
});
