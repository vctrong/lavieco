import { describe, expect, it } from "vitest";

import { DEFAULT_FREE_SHIPPING_WARD_CODES, VN_PROVINCES } from ".";
import { addressInputSchema, findWard, resolveAddress } from "./address";

describe("administrative units", () => {
  it("has the 34 provinces and 3,321 wards of the 2025 reorganisation", () => {
    expect(VN_PROVINCES).toHaveLength(34);
    expect(VN_PROVINCES.reduce((sum, p) => sum + p.wards.length, 0)).toBe(3321);
  });

  it("keeps the default free delivery wards inside Cần Thơ", () => {
    for (const code of DEFAULT_FREE_SHIPPING_WARD_CODES) expect(findWard(92, code)).not.toBeNull();
  });
});

describe("addressInputSchema", () => {
  it("accepts a province with one of its wards", () => {
    expect(
      addressInputSchema.safeParse({ provinceCode: 92, wardCode: 31135, detail: "1 Hoà Bình" })
        .success,
    ).toBe(true);
  });

  it("rejects a ward from another province", () => {
    expect(addressInputSchema.safeParse({ provinceCode: 1, wardCode: 31135 }).success).toBe(false);
  });

  it("rejects a province without a ward", () => {
    expect(addressInputSchema.safeParse({ provinceCode: 92, wardCode: null }).success).toBe(false);
  });

  it("accepts 'Khác' with a free line only", () => {
    expect(
      addressInputSchema.safeParse({ provinceCode: null, wardCode: null, detail: "Trường" })
        .success,
    ).toBe(true);
  });
});

describe("resolveAddress", () => {
  it("joins detail, ward and province", () => {
    const address = resolveAddress({ provinceCode: 92, wardCode: 31135, detail: "1 Hoà Bình" });
    expect(address.full).toBe("1 Hoà Bình, Phường Ninh Kiều, Thành phố Cần Thơ");
  });

  it("keeps only the detail for 'Khác'", () => {
    const address = resolveAddress({ provinceCode: null, wardCode: null, detail: "Trường (3h)" });
    expect(address).toMatchObject({ provinceName: "", wardName: "", full: "Trường (3h)" });
  });
});
