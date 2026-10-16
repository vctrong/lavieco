import { describe, expect, it } from "vitest";

import { LOGIN_POLICY, afterFailedAttempt, isLocked } from "./user";

const now = new Date("2026-10-17T03:00:00Z");

describe("login lockout", () => {
  it("counts failures below the threshold", () => {
    expect(afterFailedAttempt({ failedLoginCount: 2, lockedUntil: null }, now)).toEqual({
      failedLoginCount: 3,
      lockedUntil: null,
    });
  });

  it("locks for 15 minutes on the 5th failure", () => {
    const state = afterFailedAttempt({ failedLoginCount: 4, lockedUntil: null }, now);
    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + LOGIN_POLICY.lockMinutes * 60_000);
    expect(isLocked(state, now)).toBe(true);
    expect(isLocked(state, new Date(now.getTime() + 16 * 60_000))).toBe(false);
  });

  it("starts a fresh count after an expired lock", () => {
    const expired = new Date(now.getTime() - 1_000);
    expect(afterFailedAttempt({ failedLoginCount: 0, lockedUntil: expired }, now)).toEqual({
      failedLoginCount: 1,
      lockedUntil: null,
    });
  });
});
