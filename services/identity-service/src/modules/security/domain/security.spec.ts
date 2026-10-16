import { describe, expect, it } from "vitest";

import { base32Decode, base32Encode } from "./base32";
import { checkPassword } from "./password-policy";
import { generateRecoveryCodes, randomDigits } from "./secrets";
import { hotp, otpauthUri, timeStep, verifyTotp } from "./totp";

// RFC 6238 appendix B, SHA-1 seed "12345678901234567890".
const RFC_SECRET = Buffer.from("12345678901234567890");
const RFC_SECRET_B32 = base32Encode(RFC_SECRET);

describe("base32", () => {
  it("round-trips bytes", () => {
    expect(base32Decode(base32Encode(RFC_SECRET)).equals(RFC_SECRET)).toBe(true);
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
  });
});

describe("TOTP (RFC 6238 vectors)", () => {
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ])("t=%i → %s", (seconds, expected) => {
    const step = timeStep(new Date(seconds * 1000));
    expect(hotp(RFC_SECRET, step, 8)).toBe(expected);
  });

  it("accepts the current code and returns its step", () => {
    const at = new Date(1234567890 * 1000);
    const code = hotp(RFC_SECRET, timeStep(at));
    expect(verifyTotp(RFC_SECRET_B32, code, at, null)).toBe(timeStep(at));
  });

  it("tolerates one step of clock drift but not two", () => {
    const at = new Date(1234567890 * 1000);
    const previous = hotp(RFC_SECRET, timeStep(at) - 1);
    const tooOld = hotp(RFC_SECRET, timeStep(at) - 2);
    expect(verifyTotp(RFC_SECRET_B32, previous, at, null)).toBe(timeStep(at) - 1);
    expect(verifyTotp(RFC_SECRET_B32, tooOld, at, null)).toBeNull();
  });

  it("refuses a code from a step already used (no replay)", () => {
    const at = new Date(1234567890 * 1000);
    const code = hotp(RFC_SECRET, timeStep(at));
    expect(verifyTotp(RFC_SECRET_B32, code, at, timeStep(at))).toBeNull();
  });

  it("refuses malformed codes", () => {
    expect(verifyTotp(RFC_SECRET_B32, "12345", new Date(), null)).toBeNull();
  });

  it("builds an otpauth URI", () => {
    const uri = otpauthUri("ABC", "a@lavieco.io.vn");
    expect(uri).toContain("otpauth://totp/LAVIECO%20Admin%3Aa%40lavieco.io.vn?");
    expect(uri).toContain("secret=ABC");
  });
});

describe("password policy", () => {
  it("enforces length", () => {
    expect(checkPassword("short", "a@b.vn")).toEqual({ ok: false, reason: "length" });
    expect(checkPassword("x".repeat(129), "a@b.vn")).toEqual({ ok: false, reason: "length" });
  });

  it("refuses common passwords and the email name", () => {
    expect(checkPassword("Password1", "a@b.vn")).toEqual({ ok: false, reason: "common" });
    expect(checkPassword("khang2026!", "khang@taydo.vn")).toEqual({ ok: false, reason: "email" });
  });

  it("accepts a reasonable password", () => {
    expect(checkPassword("vo so tay do 2026", "khang@taydo.vn")).toEqual({ ok: true });
  });
});

describe("secrets", () => {
  it("generates 6 digits", () => {
    expect(randomDigits()).toMatch(/^\d{6}$/);
  });

  it("generates distinct recovery codes in the expected format", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
  });
});
