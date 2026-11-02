import { describe, expect, it } from "vitest";

import { dayOf, estimateDays, fillVariables, mergeAudience, paragraphsOf } from "./campaign";

describe("mergeAudience", () => {
  it("sends one email per address and gathers every ticket of that person", () => {
    const merged = mergeAudience(
      [
        { email: "A@Example.test", name: "", orderIds: ["o1"], ticketIds: ["t1", "t2"] },
        { email: "a@example.test", name: "An", orderIds: ["o2"], ticketIds: ["t3"] },
        { email: "b@example.test", name: "Bình", orderIds: ["o3"], ticketIds: ["t4"] },
      ],
      new Set(),
    );
    expect(merged.duplicates).toBe(1);
    expect(merged.recipients).toHaveLength(2);
    expect(merged.recipients[0]).toMatchObject({
      name: "An",
      orderIds: ["o1", "o2"],
      ticketIds: ["t1", "t2", "t3"],
    });
  });

  it("leaves out people who unsubscribed", () => {
    const merged = mergeAudience(
      [
        { email: "Roi@example.test", name: "" },
        { email: "o@example.test", name: "" },
      ],
      new Set(["roi@example.test"]),
    );
    expect(merged.suppressed).toBe(1);
    expect(merged.recipients.map((item) => item.email)).toEqual(["o@example.test"]);
  });
});

describe("estimateDays", () => {
  const limits = { dailyLimit: 150, ratePerMinute: 10 };

  it("counts days at the daily limit", () => {
    expect(estimateDays(0, limits)).toBe(0);
    expect(estimateDays(1, limits)).toBe(1);
    expect(estimateDays(150, limits)).toBe(1);
    expect(estimateDays(151, limits)).toBe(2);
    expect(estimateDays(301, limits)).toBe(3);
  });

  it("is limited by the rate when that is smaller", () => {
    expect(estimateDays(2_000, { dailyLimit: 10_000, ratePerMinute: 1 })).toBe(2);
  });
});

describe("dayOf", () => {
  it("rolls over at midnight in Vietnam, not in UTC", () => {
    expect(dayOf(new Date("2026-11-02T16:59:00Z"))).toBe("2026-11-02");
    expect(dayOf(new Date("2026-11-02T17:00:00Z"))).toBe("2026-11-03");
  });
});

describe("fillVariables", () => {
  const values = {
    ten: "An",
    chuong_trinh: "Workshop",
    ngay: "08/11",
    link_ve: "https://x/ve",
    link_khao_sat: "https://x/ks",
  };

  it("replaces known names, tolerates spaces, and drops unknown ones", () => {
    expect(fillVariables("Chào {{ten}}, {{ chuong_trinh }}!{{la}}", values)).toBe(
      "Chào An, Workshop!",
    );
  });
});

describe("paragraphsOf", () => {
  it("splits on blank lines", () => {
    expect(paragraphsOf("một\nhai\n\n  \nba")).toEqual(["một\nhai", "ba"]);
  });
});
