import { describe, expect, it } from "vitest";

import {
  emptyProductValues,
  emptyVariant,
  generateVariants,
  toOptions,
  toProductRequest,
} from "./product-values";

describe("toOptions", () => {
  it("derives keys from labels and drops repeated values", () => {
    expect(toOptions([{ name: "Màu", valuesText: "Xanh rêu, Nâu đất, xanh rêu" }])).toEqual([
      {
        key: "mau",
        name: "Màu",
        values: [
          { key: "xanh-reu", label: "Xanh rêu" },
          { key: "nau-dat", label: "Nâu đất" },
        ],
      },
    ]);
  });
});

describe("generateVariants", () => {
  it("keeps existing variants and adds the missing combinations", () => {
    const options = toOptions([{ name: "Màu", valuesText: "Xanh rêu, Nâu đất" }]);
    const kept = { ...emptyVariant({ mau: "xanh-reu" }), id: "a".repeat(24), sku: "LV-REU" };
    const result = generateVariants(options, [kept]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(kept);
    expect(result[1]?.optionValues).toEqual({ mau: "nau-dat" });
  });
});

describe("toProductRequest", () => {
  it("parses prices with thousand dots and sends no opening stock for an existing variant", () => {
    const values = emptyProductValues("b".repeat(24));
    values.title = "Chậu gốm";
    values.slug = "chau-gom";
    values.variants = [
      { ...emptyVariant(), sku: "lv-1", price: "89.000", initialStock: "5" },
      { ...emptyVariant(), id: "c".repeat(24), sku: "LV-2", price: "45000", initialStock: "9" },
    ];
    const request = toProductRequest(values);
    expect(request.variants[0]).toMatchObject({ sku: "LV-1", price: 89_000, initialStock: 5 });
    expect(request.variants[1]).toMatchObject({ price: 45_000, initialStock: 0 });
    expect(request.handbookLink).toBeNull();
  });
});
