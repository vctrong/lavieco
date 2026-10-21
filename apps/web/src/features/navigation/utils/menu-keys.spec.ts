import { describe, expect, it } from "vitest";

import { nextFocusIndex, openingFocusIndex } from "./menu-keys";

describe("nextFocusIndex", () => {
  it("moves down and wraps from the last item to the first", () => {
    expect(nextFocusIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextFocusIndex("ArrowDown", 2, 3)).toBe(0);
  });

  it("moves up and wraps from the first item to the last", () => {
    expect(nextFocusIndex("ArrowUp", 2, 3)).toBe(1);
    expect(nextFocusIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("starts from the ends when focus is still on the trigger", () => {
    expect(nextFocusIndex("ArrowDown", -1, 3)).toBe(0);
    expect(nextFocusIndex("ArrowUp", -1, 3)).toBe(2);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextFocusIndex("Home", 1, 4)).toBe(0);
    expect(nextFocusIndex("End", 1, 4)).toBe(3);
  });

  it("ignores other keys and empty menus", () => {
    expect(nextFocusIndex("Tab", 0, 3)).toBeNull();
    expect(nextFocusIndex("Enter", 0, 3)).toBeNull();
    expect(nextFocusIndex("ArrowDown", -1, 0)).toBeNull();
  });
});

describe("openingFocusIndex", () => {
  it("opens on the first item with ArrowDown and the last with ArrowUp", () => {
    expect(openingFocusIndex("ArrowDown", 3)).toBe(0);
    expect(openingFocusIndex("ArrowUp", 3)).toBe(2);
  });

  it("does not open on other keys (Enter/Space are the button's own click)", () => {
    expect(openingFocusIndex("Enter", 3)).toBeNull();
    expect(openingFocusIndex(" ", 3)).toBeNull();
    expect(openingFocusIndex("ArrowDown", 0)).toBeNull();
  });
});
