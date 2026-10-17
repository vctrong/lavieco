import { describe, expect, it } from "vitest";

import { decideRefresh, type Session } from "./session";

const now = new Date("2026-10-17T03:00:00Z");
const base: Session = {
  id: "s",
  userId: "u",
  userType: "member",
  familyId: "f",
  expiresAt: new Date(now.getTime() + 60_000),
  rotatedAt: null,
  revokedAt: null,
};

describe("decideRefresh", () => {
  it("rotates a live token", () => {
    expect(decideRefresh(base, now)).toBe("rotate");
  });

  it("flags reuse of an already rotated token", () => {
    expect(decideRefresh({ ...base, rotatedAt: now }, now)).toBe("reuse_detected");
  });

  it("refuses unknown, revoked or expired tokens", () => {
    expect(decideRefresh(null, now)).toBe("invalid");
    expect(decideRefresh({ ...base, revokedAt: now }, now)).toBe("invalid");
    expect(decideRefresh({ ...base, expiresAt: now }, now)).toBe("invalid");
  });

  it("treats a revoked AND rotated token as invalid, not as a new reuse", () => {
    expect(decideRefresh({ ...base, rotatedAt: now, revokedAt: now }, now)).toBe("invalid");
  });
});
