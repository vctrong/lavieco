import { describe, expect, it } from "vitest";

import { pageSlots } from "./pagination";

const view = (page: number, pages: number) =>
  pageSlots(page, pages).map((slot) => (slot.kind === "gap" ? "…" : slot.page));

describe("pageSlots", () => {
  it("lists every page when there are few", () => {
    expect(view(1, 2)).toEqual([1, 2]);
    expect(view(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the ends and the neighbours, with gaps between", () => {
    expect(view(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(view(1, 12)).toEqual([1, 2, "…", 12]);
    expect(view(12, 12)).toEqual([1, "…", 11, 12]);
  });

  it("fills a gap of one page instead of showing an ellipsis", () => {
    expect(view(4, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
  });
});
