import { describe, expect, it } from "vitest";

import { fileKey, validateRows, type ImportContext, type ImportRowRecord } from "./import-rows";

const CATEGORY = "a".repeat(24);
const MEDIA = (n: number) => String(n).padStart(24, "0");

const context = (over: Partial<ImportContext> = {}): ImportContext => ({
  mode: "upsert",
  categoryIdByKey: new Map([["gom-bot-vo-so", CATEGORY]]),
  brandIdBySlug: new Map(),
  products: new Map(),
  skuOwner: new Map(),
  imageFiles: [
    { fileName: "Chau Gom Mam Xanh-1.JPG", mediaId: MEDIA(1), publicId: "p1", width: 1, height: 1 },
    { fileName: "chau-gom-mam-xanh-2.jpg", mediaId: MEDIA(2), publicId: "p2", width: 1, height: 1 },
  ],
  ...over,
});

const row = (rowNumber: number, raw: Record<string, string>): ImportRowRecord => ({
  rowNumber,
  raw,
  slug: "",
  issues: [],
  action: null,
  skipped: false,
  result: "pending",
  resultError: null,
});

const FIRST = {
  slug: "chau-gom-mam-xanh",
  ten_san_pham: "Chậu gốm Mầm Xanh",
  danh_muc: "gom-bot-vo-so",
  sku: "LV-REU",
  tuy_chon_1_ten: "Màu",
  tuy_chon_1_gia_tri: "Xanh rêu",
  gia: "115.000",
  gia_khuyen_mai: "89000",
  ton_kho: "12",
};

describe("fileKey", () => {
  it("ignores folders, extension, case and accents", () => {
    expect(fileKey("anh/Chậu Gốm Mầm Xanh-1.JPG")).toBe("chau-gom-mam-xanh-1");
  });
});

describe("validateRows", () => {
  it("groups rows by slug into one product with variants, sale price and images by convention", () => {
    const { rows, groups } = validateRows(
      [
        row(2, FIRST),
        row(3, {
          slug: "chau-gom-mam-xanh",
          sku: "LV-NAU",
          tuy_chon_1_gia_tri: "Nâu đất",
          gia: "115000",
        }),
      ],
      context(),
    );
    expect(rows.every((r) => r.issues.every((i) => i.severity !== "error"))).toBe(true);
    expect(groups).toHaveLength(1);
    const request = groups[0]!.request!;
    expect(request.variants).toHaveLength(2);
    expect(request.variants[0]).toMatchObject({
      sku: "LV-REU",
      price: 89_000,
      compareAtPrice: 115_000,
      initialStock: 12,
    });
    expect(request.options[0]!.values.map((v) => v.key)).toEqual(["xanh-reu", "nau-dat"]);
    expect(request.images.map((i) => i.mediaId)).toEqual([MEDIA(1), MEDIA(2)]);
    expect(rows[0]!.action).toBe("create");
  });

  it("reports the faulty cell: unknown category, duplicate SKU, bad sale price, missing image", () => {
    const { rows } = validateRows(
      [
        row(2, { ...FIRST, danh_muc: "khong-co", gia_khuyen_mai: "200000", anh: "khong-thay.jpg" }),
        row(3, {
          slug: "khac",
          ten_san_pham: "Khác",
          danh_muc: "gom-bot-vo-so",
          sku: "LV-REU",
          gia: "10000",
        }),
      ],
      context(),
    );
    const codes = rows.map((r) => r.issues.map((i) => `${i.column}:${i.code}`));
    expect(codes[0]).toEqual(
      expect.arrayContaining([
        "danh_muc:category_unknown",
        "gia_khuyen_mai:price_invalid",
        "anh:image_missing",
      ]),
    );
    expect(codes[1]).toContain("sku:sku_duplicate_in_file");
  });

  it("follows the mode: create refuses an existing slug, update needs one", () => {
    const existing = new Map([
      ["chau-gom-mam-xanh", { id: "b".repeat(24), skus: new Set<string>() }],
    ]);
    const create = validateRows([row(2, FIRST)], context({ mode: "create", products: existing }));
    expect(create.rows[0]!.issues.map((i) => i.code)).toContain("slug_exists");
    const update = validateRows([row(2, FIRST)], context({ mode: "update" }));
    expect(update.rows[0]!.issues.map((i) => i.code)).toContain("slug_missing");
  });

  it("refuses a SKU owned by another product, not by the one being updated", () => {
    const owner = "c".repeat(24);
    const taken = validateRows(
      [row(2, FIRST)],
      context({ skuOwner: new Map([["LV-REU", owner]]) }),
    );
    expect(taken.rows[0]!.issues.map((i) => i.code)).toContain("sku_taken");
    const own = validateRows(
      [row(2, FIRST)],
      context({
        skuOwner: new Map([["LV-REU", owner]]),
        products: new Map([["chau-gom-mam-xanh", { id: owner, skus: new Set(["LV-REU"]) }]]),
      }),
    );
    expect(own.rows[0]!.issues.map((i) => i.code)).not.toContain("sku_taken");
    expect(own.rows[0]!.action).toBe("update");
  });

  it("leaves skipped rows out", () => {
    const { groups } = validateRows([{ ...row(2, FIRST), skipped: true }], context());
    expect(groups).toHaveLength(0);
  });
});
