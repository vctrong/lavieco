import { describe, expect, it } from "vitest";

import type { ProductOption, VariantInput } from "@lavieco/shared/shop";

import {
  assertImages,
  assertVariants,
  availabilityOf,
  nextImpact,
  optionKeyOf,
  priceRange,
  productAvailability,
  publishBlockers,
  type ProductRecord,
  type VariantRecord,
} from "./product";

const COLOR: ProductOption = {
  key: "mau",
  name: "Màu",
  values: [
    { key: "xanh-reu", label: "Xanh rêu" },
    { key: "nau-dat", label: "Nâu đất" },
  ],
};

const variant = (over: Partial<VariantInput> = {}): VariantInput => ({
  sku: "LV-POT-REU",
  optionValues: { mau: "xanh-reu" },
  price: 89_000,
  compareAtPrice: null,
  lowStockThreshold: 3,
  weightGrams: null,
  active: true,
  initialStock: 0,
  ...over,
});

const stock = (
  onHand: number,
  held = 0,
): Pick<VariantRecord, "stock" | "lowStockThreshold" | "status"> => ({
  stock: { onHand, held, sold: 0 },
  lowStockThreshold: 3,
  status: "active",
});

describe("assertVariants", () => {
  it("accepts one variant per combination", () => {
    expect(() =>
      assertVariants(
        [COLOR],
        [variant(), variant({ sku: "LV-POT-NAU", optionValues: { mau: "nau-dat" } })],
      ),
    ).not.toThrow();
  });

  it("refuses a repeated combination, a repeated SKU or an unknown value", () => {
    expect(() => assertVariants([COLOR], [variant(), variant({ sku: "OTHER" })])).toThrow();
    expect(() =>
      assertVariants([COLOR], [variant(), variant({ optionValues: { mau: "nau-dat" } })]),
    ).toThrow();
    expect(() => assertVariants([COLOR], [variant({ optionValues: { mau: "do" } })])).toThrow();
    expect(() => assertVariants([COLOR], [variant({ optionValues: {} })])).toThrow();
  });

  it("refuses a struck-through price that is not above the price", () => {
    expect(() => assertVariants([COLOR], [variant({ compareAtPrice: 89_000 })])).toThrow();
    expect(() => assertVariants([COLOR], [variant({ compareAtPrice: 115_000 })])).not.toThrow();
  });

  it("allows a product without options and a single default variant", () => {
    expect(() => assertVariants([], [variant({ optionValues: {} })])).not.toThrow();
    expect(optionKeyOf([], {})).toBe("default");
  });
});

describe("assertImages", () => {
  it("refuses repeated media and unknown option values", () => {
    const id = "a".repeat(24);
    expect(() =>
      assertImages([COLOR], [{ mediaId: id, variantValues: ["mau:xanh-reu"] }]),
    ).not.toThrow();
    expect(() =>
      assertImages(
        [COLOR],
        [
          { mediaId: id, variantValues: [] },
          { mediaId: id, variantValues: [] },
        ],
      ),
    ).toThrow();
    expect(() => assertImages([COLOR], [{ mediaId: id, variantValues: ["mau:do"] }])).toThrow();
  });
});

describe("publishBlockers (BR-20)", () => {
  const ready: Pick<ProductRecord, "images" | "story" | "handbookLink"> = {
    images: [
      { mediaId: "m", publicId: "p", width: 1, height: 1, alt: "Chậu gốm", variantValues: [] },
    ],
    story: { message: "m", story: "s", lesson: "l" },
    handbookLink: { slug: "vo-so", title: "Vỏ sò" },
  };

  it("is empty for a complete product with a variant on sale", () => {
    expect(publishBlockers(ready, [{ status: "active" }])).toEqual([]);
  });

  it("lists every missing part", () => {
    expect(
      publishBlockers(
        { images: [], story: { message: "", story: "s", lesson: "l" }, handbookLink: null },
        [{ status: "archived" }],
      ),
    ).toEqual(["no_image", "story_incomplete", "handbook_missing", "no_active_variant"]);
    expect(
      publishBlockers({ ...ready, images: [{ ...ready.images[0]!, alt: " " }] }, [
        { status: "active" },
      ]),
    ).toEqual(["image_alt_missing"]);
  });
});

describe("availability", () => {
  it("is out at zero, low at or below the threshold, else in stock", () => {
    expect(availabilityOf(stock(0))).toBe("out");
    expect(availabilityOf(stock(5, 5))).toBe("out");
    expect(availabilityOf(stock(3))).toBe("low");
    expect(availabilityOf(stock(10, 2))).toBe("in_stock");
    expect(availabilityOf({ ...stock(10), status: "archived" })).toBe("out");
  });

  it("takes the best variant for the product card", () => {
    const v = (onHand: number) => ({ ...stock(onHand) }) as VariantRecord;
    expect(productAvailability([v(0), v(2)])).toBe("low");
    expect(productAvailability([v(0), v(9)])).toBe("in_stock");
    expect(productAvailability([v(0)])).toBe("out");
  });
});

describe("nextImpact (BR-23)", () => {
  const item = { label: "Vỏ sò tái chế", value: "120", unit: "g", source: "Cân tại xưởng" };

  it("asks for approval again when figures change", () => {
    const approved = {
      items: [item],
      status: "approved" as const,
      approvedBy: "u",
      approvedAt: new Date(),
    };
    expect(nextImpact(approved, [item])).toBe(approved);
    expect(nextImpact(approved, [{ ...item, value: "130" }]).status).toBe("pending");
    expect(nextImpact(approved, []).status).toBe("none");
  });
});

describe("priceRange", () => {
  it("only counts active variants", () => {
    expect(
      priceRange([
        { price: 89_000, status: "active" },
        { price: 45_000, status: "archived" },
        { price: 99_000, status: "active" },
      ]),
    ).toEqual({ priceMin: 89_000, priceMax: 99_000 });
  });
});
