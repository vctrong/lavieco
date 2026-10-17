import { describe, expect, it } from "vitest";

import { toSearchKey, toSlug } from "./search-key";

describe("toSearchKey", () => {
  it("removes diacritics, maps đ and lower-cases", () => {
    expect(toSearchKey("  Đổi Mới   Sáng Tạo ")).toBe("doi moi sang tao");
  });
});

describe("toSlug", () => {
  it.each([
    ["Workshop làm chậu cây từ bột vỏ sò", "workshop-lam-chau-cay-tu-bot-vo-so"],
    ["Triển lãm: Dấu chân & phù sa!", "trien-lam-dau-chan-phu-sa"],
    ["---", ""],
  ])("slugifies %s", (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });

  it("caps the length without a trailing dash", () => {
    expect(toSlug("ab cd ef", 3)).toBe("ab");
  });
});
