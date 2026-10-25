import { describe, expect, it } from "vitest";

import { inferMaterial } from "./infer-material";

const materials = [
  { id: "plastic_bottle" as const, keywords: ["chai nhựa", "nhựa"] },
  { id: "aluminum_can" as const, keywords: ["lon", "lon bia"] },
  { id: "glass_jar" as const, keywords: ["thủy tinh", "chai thủy tinh"] },
];

describe("inferMaterial", () => {
  it("finds the material a message talks about, without diacritics", () => {
    expect(inferMaterial("Mình có nhiều LON BIA quá", materials)).toBe("aluminum_can");
    expect(inferMaterial("chai nhua cu", materials)).toBe("plastic_bottle");
  });

  it("prefers the longest keyword", () => {
    expect(inferMaterial("có cái chai thủy tinh", materials)).toBe("glass_jar");
  });

  it("matches whole words only and returns null otherwise", () => {
    expect(inferMaterial("longan và nhãn", materials)).toBeNull();
    expect(inferMaterial("xin chào", materials)).toBeNull();
  });
});
