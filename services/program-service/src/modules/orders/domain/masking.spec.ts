import { describe, expect, it } from "vitest";

import { maskEmail, maskPhone } from "./masking";

describe("maskEmail", () => {
  it.each([
    ["nguyenvana@gmail.com", "ng***@gmail.com"],
    ["abc@example.test", "ab***@example.test"],
    ["ab@x.com", "a***@x.com"],
    ["a@x.com", "a***@x.com"],
    ["  Mixed.Case@Example.Test ", "Mi***@Example.Test"],
  ])("%s → %s", (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it.each(["", "   ", "no-at-sign", "@x.com", "a@localhost", "a b@x.com", "***@x.com"])(
    "hides %j completely or changes it",
    (input) => {
      const masked = maskEmail(input);
      expect(masked).not.toBe(input);
      if (!input.includes("@") || input.startsWith("@") || input.includes(" ")) {
        expect(masked).toBe("***");
      }
    },
  );
});

describe("maskPhone", () => {
  it.each([
    ["0912345789", "***789"],
    ["+84912345789", "***789"],
    ["+84 912 345 789", "***789"],
    ["0912.345.789", "***789"],
  ])("%s → %s", (input, expected) => {
    expect(maskPhone(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "12", "123", "***789", "+84"])("hides %j completely", (input) => {
    expect(maskPhone(input)).toBe("***");
    expect(maskPhone(input)).not.toBe(input);
  });
});
