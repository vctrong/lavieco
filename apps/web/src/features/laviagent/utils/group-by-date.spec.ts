import { describe, expect, it } from "vitest";

import { groupByDate, historyGroupOf } from "./group-by-date";

const now = new Date(2026, 9, 25, 15, 0);
const at = (days: number, hour = 10) => new Date(2026, 9, 25 - days, hour).toISOString();

describe("historyGroupOf", () => {
  it("splits today, the last 7 days and older by local calendar day", () => {
    expect(historyGroupOf(at(0, 0), now)).toBe("today");
    expect(historyGroupOf(at(1, 23), now)).toBe("week");
    expect(historyGroupOf(at(6), now)).toBe("week");
    expect(historyGroupOf(at(7), now)).toBe("older");
  });

  it("returns only non-empty groups in order", () => {
    const groups = groupByDate([{ updatedAt: at(0) }, { updatedAt: at(30) }], now);
    expect(groups.map((entry) => entry.group)).toEqual(["today", "older"]);
  });
});
