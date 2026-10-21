import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "../constants/config";
import type { PrimaryNavItem } from "../types";
import { groupNavItems } from "./group-nav-items";

const item = (id: PrimaryNavItem["id"], priority: PrimaryNavItem["priority"]): PrimaryNavItem => ({
  id,
  href: `/${id}`,
  priority,
});

const ids = (items: readonly PrimaryNavItem[]) => items.map((entry) => entry.id);

describe("groupNavItems", () => {
  it("keeps priorities 1 and 2 inline, priority 3 in the explore menu", () => {
    const groups = groupNavItems([
      item("story", 1),
      item("collection", 2),
      item("handbook", 3),
      item("programs", 1),
    ]);
    expect(ids(groups.inline)).toEqual(["story", "collection", "programs"]);
    expect(ids(groups.explore)).toEqual(["handbook"]);
  });

  it("puts everything that is not always visible into the 'more' menu, in order", () => {
    const groups = groupNavItems([
      item("story", 1),
      item("impact", 3),
      item("collection", 2),
      item("handbook", 3),
    ]);
    expect(ids(groups.more)).toEqual(["impact", "collection", "handbook"]);
  });

  it("returns empty groups for no items", () => {
    expect(groupNavItems([])).toEqual({ inline: [], explore: [], more: [] });
  });

  it("matches the design for the real links", () => {
    const groups = groupNavItems(NAV_ITEMS);
    expect(ids(groups.inline)).toEqual(["story", "programs", "collection"]);
    expect(ids(groups.explore)).toEqual(["handbook", "impact"]);
    expect(ids(groups.more)).toEqual(["collection", "handbook", "impact"]);
  });
});
