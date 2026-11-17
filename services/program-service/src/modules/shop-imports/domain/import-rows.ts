import { toSlug } from "@lavieco/shared";
import {
  IMPORT_LIMITS,
  SHOP_LIMITS,
  productCreateRequestSchema,
  type ImportColumn,
  type ImportImageFile,
  type ImportIssue,
  type ImportIssueCode,
  type ImportMode,
  type ProductCreateRequest,
  type ProductStatus,
} from "@lavieco/shared/shop";

/** One parsed spreadsheet row (cells as trimmed text). */
export type RawRow = { rowNumber: number; raw: Record<string, string> };

export type ImportRowRecord = RawRow & {
  slug: string;
  issues: ImportIssue[];
  action: "create" | "update" | null;
  skipped: boolean;
  result: "pending" | "done" | "failed";
  resultError: string | null;
};

/** What the validation needs to know about the catalogue. */
export type ImportContext = {
  mode: ImportMode;
  categoryIdByKey: ReadonlyMap<string, string>;
  brandIdBySlug: ReadonlyMap<string, string>;
  /** Existing products by slug, with their variants' SKUs. */
  products: ReadonlyMap<string, { id: string; skus: ReadonlySet<string> }>;
  /** SKU → product id, for every existing variant. */
  skuOwner: ReadonlyMap<string, string>;
  imageFiles: readonly ImportImageFile[];
};

export type BuiltGroup = {
  slug: string;
  rows: number[];
  request: ProductCreateRequest | null;
  /** Requested status after save (`trang_thai`). */
  status: ProductStatus;
  /** Rows' `ton_kho` by SKU, to set the stock of variants that already exist. */
  stockBySku: Map<string, number>;
  /** Image file names this group wants, in order. */
  imageNames: string[];
};

const cell = (row: RawRow, column: ImportColumn) => (row.raw[column] ?? "").trim();

/** Matching key of a file name: no folder, no extension, accents and case removed. */
export function fileKey(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return toSlug(base.replace(/\.[a-z0-9]+$/i, ""), 120);
}

const STATUS: Record<string, ProductStatus> = {
  "": "draft",
  nhap: "draft",
  xuat_ban: "published",
  "xuat-ban": "published",
  an: "hidden",
};

const int = (text: string) =>
  /^-?\d[\d.\s]*$/.test(text) ? Number(text.replace(/[.\s]/g, "")) : Number.NaN;

function issue(
  column: string,
  code: ImportIssueCode,
  severity: "error" | "warning" = "error",
): ImportIssue {
  return { column, code, severity };
}

/** Zod path of the built request → the template column to blame. */
function columnOf(path: readonly PropertyKey[]): ImportColumn {
  const [head, , field] = path.map(String);
  const map: Record<string, ImportColumn> = {
    slug: "slug",
    title: "ten_san_pham",
    summary: "tom_tat",
    story: "thong_diep",
    handbookLink: "chuong_cam_nang",
    materials: "chat_lieu",
    impactItems: "tac_dong",
    images: "anh",
    seo: "seo_tieu_de",
    sortOrder: "thu_tu",
    options: "tuy_chon_1_gia_tri",
  };
  if (head === "variants") {
    if (field === "price" || field === "compareAtPrice") return "gia";
    if (field === "lowStockThreshold") return "nguong_sap_het";
    if (field === "initialStock") return "ton_kho";
    return "sku";
  }
  return map[head ?? ""] ?? "slug";
}

/** File names wanted by one row group: column `anh`, else the `<slug>-<n>` / `<sku>-<n>` convention. */
function wantedImages(
  slug: string,
  rows: readonly RawRow[],
  files: readonly ImportImageFile[],
): { name: string; value: string | null }[] {
  const listed = rows.flatMap((row) =>
    cell(row, "anh")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, value] = part.split("@");
        return { name: name!.trim(), value: value?.trim() || null };
      }),
  );
  if (listed.length > 0) return listed;
  const byConvention = (prefix: string) =>
    files
      .map((file) => ({ file, key: fileKey(file.fileName) }))
      .filter(({ key }) => new RegExp(`^${prefix}-(\\d+)$`).test(key))
      .sort((a, b) => Number(a.key.split("-").pop()) - Number(b.key.split("-").pop()))
      .map(({ file }) => file.fileName);
  const own = byConvention(slug).map((name) => ({ name, value: null }));
  const perVariant = rows.flatMap((row) => {
    const sku = cell(row, "sku").toLowerCase();
    const value = cell(row, "tuy_chon_1_gia_tri");
    return sku ? byConvention(toSlug(sku, 60)).map((name) => ({ name, value: value || null })) : [];
  });
  return [...own, ...perVariant];
}

/**
 * Builds one product request from the rows sharing a slug and returns the issues found,
 * keyed by row number. Product fields come from the first row; later rows may leave them
 * empty but may not contradict them.
 */
export function buildGroup(
  slug: string,
  rows: readonly RawRow[],
  context: ImportContext,
): { group: BuiltGroup; issues: Map<number, ImportIssue[]> } {
  const issues = new Map<number, ImportIssue[]>(rows.map((row) => [row.rowNumber, []]));
  const add = (row: RawRow, item: ImportIssue) => issues.get(row.rowNumber)!.push(item);
  const first = rows[0]!;
  const existing = context.products.get(slug);

  if (!slug) add(first, issue("slug", "required"));
  if (context.mode === "create" && existing) add(first, issue("slug", "slug_exists"));
  if (context.mode === "update" && !existing) add(first, issue("slug", "slug_missing"));

  for (const row of rows.slice(1)) {
    for (const column of ["ten_san_pham", "danh_muc"] as const) {
      const value = cell(row, column);
      if (value && value !== cell(first, column)) add(row, issue(column, "group_conflict"));
    }
  }

  const categoryKey = cell(first, "danh_muc");
  const categoryId = context.categoryIdByKey.get(categoryKey);
  if (!categoryKey) add(first, issue("danh_muc", "required"));
  else if (!categoryId) add(first, issue("danh_muc", "category_unknown"));
  const brandSlug = cell(first, "thuong_hieu_doi_tac");
  const brandId = brandSlug ? context.brandIdBySlug.get(brandSlug) : null;
  if (brandSlug && !brandId) add(first, issue("thuong_hieu_doi_tac", "brand_unknown"));

  // Options: names from the first row; values collected from every row.
  const optionNames = ([1, 2, 3] as const)
    .map((n) => cell(first, `tuy_chon_${n}_ten`))
    .filter(Boolean);
  const options = optionNames.map((name, index) => {
    const column = `tuy_chon_${index + 1}_gia_tri` as ImportColumn;
    const labels = [...new Set(rows.map((row) => cell(row, column)).filter(Boolean))];
    return {
      key: toSlug(name, 40) || "x",
      name,
      values: labels.map((label) => ({ key: toSlug(label, 40) || "x", label })),
    };
  });

  const skusInGroup = new Set<string>();
  const stockBySku = new Map<string, number>();
  const variants = rows.map((row) => {
    const sku = cell(row, "sku").toUpperCase();
    if (!sku) add(row, issue("sku", "required"));
    else if (skusInGroup.has(sku)) add(row, issue("sku", "sku_duplicate_in_file"));
    skusInGroup.add(sku);
    const owner = context.skuOwner.get(sku);
    if (owner && owner !== existing?.id) add(row, issue("sku", "sku_taken"));

    const optionValues: Record<string, string> = {};
    options.forEach((option, index) => {
      const label = cell(row, `tuy_chon_${index + 1}_gia_tri` as ImportColumn);
      if (!label) add(row, issue(`tuy_chon_${index + 1}_gia_tri`, "option_mismatch"));
      else optionValues[option.key] = toSlug(label, 40) || "x";
    });

    const list = int(cell(row, "gia"));
    const sale = cell(row, "gia_khuyen_mai") ? int(cell(row, "gia_khuyen_mai")) : null;
    if (!cell(row, "gia")) add(row, issue("gia", "required"));
    else if (!Number.isInteger(list) || list <= 0) add(row, issue("gia", "price_invalid"));
    if (sale !== null && (!Number.isInteger(sale) || sale <= 0 || sale >= list)) {
      add(row, issue("gia_khuyen_mai", "price_invalid"));
    }
    const stockText = cell(row, "ton_kho");
    const stock = stockText ? int(stockText) : 0;
    if (stockText && (!Number.isInteger(stock) || stock < 0)) add(row, issue("ton_kho", "invalid"));
    else if (stockText) stockBySku.set(sku, stock);
    const threshold = cell(row, "nguong_sap_het");

    return {
      sku,
      optionValues,
      price: sale ?? list,
      compareAtPrice: sale !== null ? list : null,
      lowStockThreshold: threshold ? int(threshold) : SHOP_LIMITS.lowStockDefault,
      weightGrams: null,
      active: true,
      initialStock: Number.isInteger(stock) && stock > 0 ? stock : 0,
    };
  });

  // Images: listed or by convention; each must be among the uploaded files.
  const filesByKey = new Map(context.imageFiles.map((file) => [fileKey(file.fileName), file]));
  const wanted = wantedImages(slug, rows, context.imageFiles);
  const altTexts = cell(first, "alt_anh")
    .split(";")
    .map((s) => s.trim());
  const images = wanted.flatMap((want, index) => {
    const file = filesByKey.get(fileKey(want.name));
    if (!file) {
      add(first, issue("anh", "image_missing"));
      return [];
    }
    const option = options[0];
    const valueKey = want.value ? toSlug(want.value, 40) : null;
    return [
      {
        mediaId: file.mediaId,
        alt: altTexts[index] || cell(first, "ten_san_pham"),
        variantValues: option && valueKey ? [`${option.key}:${valueKey}`] : [],
      },
    ];
  });
  if (images.length > SHOP_LIMITS.imagesMax) add(first, issue("anh", "too_many_images"));

  const impactItems = cell(first, "tac_dong")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [label = "", value = "", unit = "", source = ""] = part.split("|").map((s) => s.trim());
      return { label, value, unit, source };
    });

  const status = STATUS[cell(first, "trang_thai").toLowerCase()];
  if (status === undefined) add(first, issue("trang_thai", "invalid"));

  const chapter = cell(first, "chuong_cam_nang");
  const candidate = {
    slug,
    title: cell(first, "ten_san_pham"),
    summary: cell(first, "tom_tat"),
    categoryId: categoryId ?? "000000000000000000000000",
    partnerBrandId: brandId ?? null,
    story: {
      message: cell(first, "thong_diep"),
      story: cell(first, "cau_chuyen"),
      lesson: cell(first, "bai_hoc"),
    },
    handbookLink: chapter
      ? { slug: chapter, title: cell(first, "ten_chuong_cam_nang") || chapter }
      : null,
    materials: cell(first, "chat_lieu")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
    care: "",
    dimensions: "",
    options,
    variants,
    images: images.slice(0, SHOP_LIMITS.imagesMax),
    impactItems,
    seo: { title: cell(first, "seo_tieu_de"), description: cell(first, "seo_mo_ta") },
    badges: [],
    sortOrder: cell(first, "thu_tu") ? int(cell(first, "thu_tu")) : 0,
  };
  const parsed = productCreateRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const zodIssue of parsed.error.issues) {
      const [head, index] = zodIssue.path;
      const row = head === "variants" && typeof index === "number" ? (rows[index] ?? first) : first;
      const column = columnOf(zodIssue.path);
      const list = issues.get(row.rowNumber)!;
      if (!list.some((existingIssue) => existingIssue.column === column)) {
        list.push(issue(column, zodIssue.code === "too_big" ? "too_long" : "invalid"));
      }
    }
  }
  const wantsPublish = status === "published";
  const storyIncomplete =
    !candidate.story.message ||
    !candidate.story.story ||
    !candidate.story.lesson ||
    !chapter ||
    images.length === 0;
  if (wantsPublish && storyIncomplete)
    add(first, issue("trang_thai", "publish_incomplete", "warning"));

  return {
    group: {
      slug,
      rows: rows.map((row) => row.rowNumber),
      request: parsed.success ? parsed.data : null,
      status: status ?? "draft",
      stockBySku,
      imageNames: wanted.map((w) => w.name),
    },
    issues,
  };
}

/** Rows grouped by slug (in file order), skipping rows the admin set aside. */
export function groupRows<T extends RawRow & { skipped?: boolean }>(rows: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (row.skipped) continue;
    const slug = (row.raw.slug ?? "").trim().toLowerCase();
    groups.set(slug, [...(groups.get(slug) ?? []), row]);
  }
  return groups;
}

/** Validates every row; returns the rows with their issues and planned action. */
export function validateRows(
  rows: readonly ImportRowRecord[],
  context: ImportContext,
): { rows: ImportRowRecord[]; groups: BuiltGroup[] } {
  const next = rows.map((row) => ({
    ...row,
    slug: (row.raw.slug ?? "").trim().toLowerCase(),
    issues: [] as ImportIssue[],
    action: null as "create" | "update" | null,
  }));
  const byNumber = new Map(next.map((row) => [row.rowNumber, row]));
  const seenSkus = new Map<string, number>();
  for (const row of next) {
    if (row.skipped) continue;
    const sku = (row.raw.sku ?? "").trim().toUpperCase();
    if (sku && seenSkus.has(sku) && seenSkus.get(sku) !== row.rowNumber) {
      row.issues.push(issue("sku", "sku_duplicate_in_file"));
    }
    if (sku) seenSkus.set(sku, row.rowNumber);
  }
  const groups: BuiltGroup[] = [];
  for (const [slug, groupRowsList] of groupRows(next)) {
    const { group, issues } = buildGroup(slug, groupRowsList, context);
    groups.push(group);
    for (const [rowNumber, found] of issues) {
      const row = byNumber.get(rowNumber)!;
      for (const item of found) {
        if (!row.issues.some((i) => i.column === item.column && i.code === item.code))
          row.issues.push(item);
      }
      row.action = context.products.has(slug) ? "update" : "create";
    }
  }
  return { rows: next, groups };
}

export const hasErrors = (row: Pick<ImportRowRecord, "issues">) =>
  row.issues.some((item) => item.severity === "error");

export { IMPORT_LIMITS };
