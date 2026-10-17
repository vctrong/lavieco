import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./normalize-email";
import { normalizePhone } from "./normalize-phone";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Ten.Ho@Example.COM ")).toBe("ten.ho@example.com");
  });

  it("keeps plus tags (different mailbox)", () => {
    expect(normalizeEmail("a+tag@example.com")).toBe("a+tag@example.com");
  });
});

describe("normalizePhone", () => {
  it.each([
    ["0912 345 678", "+84912345678"],
    ["0912.345.678", "+84912345678"],
    ["+84 912 345 678", "+84912345678"],
    ["84912345678", "+84912345678"],
    ["0084912345678", "+84912345678"],
    ["(0292) 3888 999", "+842923888999"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["12345", "abc", "+1 415 555 0100", "0012", "0912"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
