import { describe, expect, it } from "vitest";

import { formatSchedule, monthLabel, paragraphsOf, upcomingMonths } from "./format";

describe("events format helpers", () => {
  it("formats a same-day schedule in Vietnam time", () => {
    expect(formatSchedule("2026-11-15T02:00:00.000Z", "2026-11-15T05:00:00.000Z")).toMatch(
      /15\/11\/2026 · 09:00–12:00$/,
    );
  });

  it("splits paragraphs on blank lines only", () => {
    expect(paragraphsOf("Một\ndòng\n\n  Hai  \n\n\n")).toEqual(["Một\ndòng", "Hai"]);
  });

  it("lists months from the current Vietnam month, across years", () => {
    expect(upcomingMonths(3, new Date("2026-12-31T18:00:00.000Z"))).toEqual([
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(monthLabel("2027-01")).toBe("Tháng 1/2027");
  });
});
