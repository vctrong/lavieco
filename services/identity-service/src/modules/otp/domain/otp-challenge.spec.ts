import { describe, expect, it } from "vitest";

import { checkAttempt, mailFor, type OtpChallenge } from "./otp-challenge";

const now = new Date("2026-10-17T03:00:00Z");
const challenge: OtpChallenge = {
  challengeId: "c",
  emailNormalized: "a@b.vn",
  purpose: "signup",
  codeHash: "h",
  expiresAt: new Date(now.getTime() + 60_000),
  attempts: 0,
  verifiedAt: null,
  consumedAt: null,
};

describe("checkAttempt", () => {
  it("allows attempts until the 5th", () => {
    expect(checkAttempt({ ...challenge, attempts: 4 }, now)).toBe("ok");
    expect(checkAttempt({ ...challenge, attempts: 5 }, now)).toBe("attempts_exceeded");
  });

  it("refuses expired and already verified challenges", () => {
    expect(checkAttempt({ ...challenge, expiresAt: now }, now)).toBe("expired");
    expect(checkAttempt({ ...challenge, verifiedAt: now }, now)).toBe("already_used");
  });
});

describe("mailFor", () => {
  it("does not send a usable sign-up code to an existing account", () => {
    expect(mailFor("signup", { exists: true, isMember: true })).toBe("account_exists");
    expect(mailFor("signup", { exists: false, isMember: false })).toBe("code");
  });

  it("only sends reset codes to member accounts", () => {
    expect(mailFor("reset_password", { exists: true, isMember: true })).toBe("code");
    expect(mailFor("reset_password", { exists: true, isMember: false })).toBe("none");
    expect(mailFor("reset_password", { exists: false, isMember: false })).toBe("none");
  });

  it("always sends checkout and lookup codes (guests have no account)", () => {
    expect(mailFor("checkout", { exists: false, isMember: false })).toBe("code");
    expect(mailFor("ticket_lookup", { exists: false, isMember: false })).toBe("code");
  });
});
