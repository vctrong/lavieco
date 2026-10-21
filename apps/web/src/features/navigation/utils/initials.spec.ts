import { describe, expect, it } from "vitest";

import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("takes the first letters of the first and last words", () => {
    expect(initialsOf("Võ Chí Trọng")).toBe("VT");
    expect(initialsOf("  đặng   an ")).toBe("ĐA");
  });

  it("uses one letter for a single word and nothing for an empty name", () => {
    expect(initialsOf("Lan")).toBe("L");
    expect(initialsOf("   ")).toBe("");
  });
});
