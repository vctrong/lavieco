import { describe, expect, it } from "vitest";

import { formatCountdown, formatDateTime } from "./format";

describe("checkout formatting", () => {
  it("shows the hold countdown as mm:ss and never below zero", () => {
    expect(formatCountdown(14 * 60 + 23)).toBe("14:23");
    expect(formatCountdown(5)).toBe("00:05");
    expect(formatCountdown(-3)).toBe("00:00");
  });

  it("formats a check-in time in Vietnam time", () => {
    expect(formatDateTime("2026-10-20T02:12:00Z")).toBe("09:12, 20/10/2026");
  });
});
