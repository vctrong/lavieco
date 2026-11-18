import { describe, expect, it } from "vitest";

import {
  isTooSmall,
  moveRect,
  nudgeRect,
  rectFromDrag,
  resizeRect,
  toPercent,
} from "./hotspot-geometry";

describe("hotspot geometry", () => {
  it("converts a pointer position to percent of the page, clamped", () => {
    const box = { left: 100, top: 50, width: 200, height: 400 } as DOMRect;
    expect(toPercent(200, 250, box)).toEqual({ x: 50, y: 50 });
    expect(toPercent(0, 999, box)).toEqual({ x: 0, y: 100 });
  });

  it("builds a rectangle from a drag in any direction", () => {
    expect(rectFromDrag({ x: 40, y: 30 }, { x: 10, y: 10 })).toEqual({
      x: 10,
      y: 10,
      w: 30,
      h: 20,
    });
    expect(isTooSmall(rectFromDrag({ x: 1, y: 1 }, { x: 2, y: 1.5 }))).toBe(true);
  });

  it("never moves a rectangle off the page", () => {
    expect(moveRect({ x: 80, y: 80, w: 15, h: 15 }, 20, 20)).toEqual({
      x: 85,
      y: 85,
      w: 15,
      h: 15,
    });
  });

  it("resizes from a corner and keeps a minimum size", () => {
    const rect = { x: 10, y: 10, w: 20, h: 20 };
    expect(resizeRect(rect, "se", { x: 50, y: 40 })).toEqual({ x: 10, y: 10, w: 40, h: 30 });
    expect(resizeRect(rect, "nw", { x: 40, y: 40 })).toEqual({ x: 28, y: 28, w: 2, h: 2 });
  });

  it("nudges with the arrow keys", () => {
    const rect = { x: 10, y: 10, w: 20, h: 20 };
    expect(nudgeRect(rect, "ArrowRight", false)).toEqual({ x: 11, y: 10, w: 20, h: 20 });
    expect(nudgeRect(rect, "ArrowDown", true)).toEqual({ x: 10, y: 10, w: 20, h: 21 });
    expect(nudgeRect(rect, "Enter", false)).toBeNull();
  });
});
