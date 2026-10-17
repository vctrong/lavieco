import { describe, expect, it } from "vitest";

import { formatRange, isoToVietnamLocal, vietnamLocalToIso } from "./format";

describe("Vietnam local time", () => {
  it("converts both ways", () => {
    expect(vietnamLocalToIso("2026-11-15T09:00")).toBe("2026-11-15T02:00:00.000Z");
    expect(isoToVietnamLocal("2026-11-15T02:00:00.000Z")).toBe("2026-11-15T09:00");
  });

  it("crosses midnight correctly", () => {
    expect(vietnamLocalToIso("2026-11-01T03:00")).toBe("2026-10-31T20:00:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(vietnamLocalToIso("15/11/2026")).toBeNull();
    expect(isoToVietnamLocal(null)).toBe("");
  });
});

describe("formatRange", () => {
  it("collapses a same-day range", () => {
    expect(formatRange("2026-11-15T02:00:00.000Z", "2026-11-15T05:00:00.000Z")).toBe(
      "15/11/2026 · 09:00–12:00",
    );
  });
});
