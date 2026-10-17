import { describe, expect, it } from "vitest";

import { eventTypeKey, isSelectable, type EventTypeRecord } from "./event-type";

describe("eventTypeKey", () => {
  it("derives a stable key from the Vietnamese name", () => {
    expect(eventTypeKey({ vi: "Triển lãm" })).toBe("trien-lam");
  });

  it("falls back when the name has no letters", () => {
    expect(eventTypeKey({ vi: "!!!" })).toBe("loai");
  });
});

describe("isSelectable", () => {
  const type: EventTypeRecord = {
    id: "64b7f0c2a1b2c3d4e5f60718",
    key: "workshop",
    name: { vi: "Workshop" },
    sortOrder: 10,
    archivedAt: null,
    revision: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("accepts active types only", () => {
    expect(isSelectable(type)).toBe(true);
    expect(isSelectable({ ...type, archivedAt: new Date() })).toBe(false);
    expect(isSelectable(null)).toBe(false);
  });
});
