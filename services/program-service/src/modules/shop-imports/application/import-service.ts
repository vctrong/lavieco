import type { TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import {
  IMPORT_COLUMNS,
  IMPORT_LIMITS,
  type ImportColumn,
  type ImportImagesRequest,
  type ImportMode,
  type ImportRemovedImagesRequest,
  type ProductCreateRequest,
} from "@lavieco/shared/shop";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail } from "../../audit";
import type { SheetColumn, SheetCell, Workbook, WorkbookWriter } from "../../registrations";
import type { CatalogRepository, ProductAdminService, ProductRepository } from "../../shop-catalog";
import {
  hasErrors,
  validateRows,
  type BuiltGroup,
  type ImportContext,
  type ImportRowRecord,
  type RawRow,
} from "../domain/import-rows";

export const IMPORT_JOB_REPOSITORY = Symbol("IMPORT_JOB_REPOSITORY");
export const SPREADSHEET_READER = Symbol("SPREADSHEET_READER");

export type ImportJobRecord = {
  id: string;
  fileName: string;
  mode: ImportMode;
  status: "ready" | "committing" | "done" | "cancelled";
  rows: ImportRowRecord[];
  imageFiles: ImportImagesRequest["files"];
  removedImages: Record<string, string[]>;
  createdBy: string;
  expiresAt: Date;
};

export interface ImportJobRepository {
  newId(): string;
  insert(job: ImportJobRecord): Promise<void>;
  find(id: string): Promise<ImportJobRecord | null>;
  save(job: ImportJobRecord): Promise<void>;
}

/** Reads `.xlsx` or `.csv` into trimmed text rows keyed by header. */
export interface SpreadsheetReader {
  read(bytes: Buffer, fileName: string): Promise<RawRow[]>;
}

export type ImportActor = { userId: string; roles: readonly Role[]; requestId: string | null };

/** Job lifetime: shorter than the 24 h after which unattached uploads are swept. */
const JOB_TTL_MS = 20 * 60 * 60 * 1000;

const STATUS_TEXT = {
  draft: "nhap",
  published: "xuat_ban",
  hidden: "an",
  archived: "nhap",
} as const;

/**
 * Bulk import and export of products (UC-39, docs/08 §8). Validation runs on upload and
 * after every edit; the commit goes product by product through the regular product use
 * cases (same rules, same transactions), in batches, and can be called again after any
 * interruption: done rows are skipped and SKU/slug uniqueness prevents duplicates.
 */
export class ImportService {
  constructor(
    private readonly jobs: ImportJobRepository,
    private readonly reader: SpreadsheetReader,
    private readonly catalog: CatalogRepository,
    private readonly products: ProductRepository,
    private readonly productAdmin: ProductAdminService,
    private readonly workbook: WorkbookWriter,
    private readonly audit: AuditTrail,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async upload(
    file: { bytes: Buffer; name: string },
    mode: ImportMode,
    actor: ImportActor,
    now = new Date(),
  ) {
    if (file.bytes.byteLength > IMPORT_LIMITS.fileBytes)
      throw new DomainError("import.file_invalid");
    let raw: RawRow[];
    try {
      raw = await this.reader.read(file.bytes, file.name);
    } catch {
      throw new DomainError("import.file_invalid");
    }
    // Template example rows are ignored (SKU starting with VIDU-).
    raw = raw.filter((row) => !(row.raw.sku ?? "").toUpperCase().startsWith("VIDU-"));
    if (raw.length === 0 || raw.length > IMPORT_LIMITS.rows)
      throw new DomainError("import.file_invalid");
    const job: ImportJobRecord = {
      id: this.jobs.newId(),
      fileName: file.name.slice(0, 200),
      mode,
      status: "ready",
      rows: raw.map((row) => ({
        ...row,
        slug: "",
        issues: [],
        action: null,
        skipped: false,
        result: "pending",
        resultError: null,
      })),
      imageFiles: [],
      removedImages: {},
      createdBy: actor.userId,
      expiresAt: new Date(now.getTime() + JOB_TTL_MS),
    };
    const { rows } = validateRows(job.rows, await this.context(job));
    job.rows = rows;
    await this.jobs.insert(job);
    return this.view(job);
  }

  async get(id: string) {
    return this.view(await this.load(id));
  }

  async updateRow(id: string, rowNumber: number, raw: Record<string, string>) {
    const job = await this.editable(id);
    const row = job.rows.find((r) => r.rowNumber === rowNumber);
    if (!row) throw new DomainError("common.not_found");
    row.raw = Object.fromEntries(
      IMPORT_COLUMNS.map((column) => [column, (raw[column] ?? row.raw[column] ?? "").trim()]),
    );
    return this.revalidate(job);
  }

  async skipRow(id: string, rowNumber: number, skipped: boolean) {
    const job = await this.editable(id);
    const row = job.rows.find((r) => r.rowNumber === rowNumber);
    if (!row) throw new DomainError("common.not_found");
    row.skipped = skipped;
    return this.revalidate(job);
  }

  async addImages(id: string, input: ImportImagesRequest) {
    const job = await this.editable(id);
    const known = new Set(job.imageFiles.map((file) => file.mediaId));
    job.imageFiles = [
      ...job.imageFiles,
      ...input.files.filter((file) => !known.has(file.mediaId)),
    ].slice(0, IMPORT_LIMITS.images);
    return this.revalidate(job);
  }

  async setRemovedImages(id: string, input: ImportRemovedImagesRequest) {
    const job = await this.editable(id);
    job.removedImages = { ...job.removedImages, [input.slug]: input.mediaIds };
    await this.jobs.save(job);
    return this.view(job);
  }

  async cancel(id: string) {
    const job = await this.editable(id);
    job.status = "cancelled";
    await this.jobs.save(job);
    return this.view(job);
  }

  /** One batch of products; call again while `status` is `committing`. */
  async commit(id: string, actor: ImportActor, now = new Date()) {
    const job = await this.load(id);
    if (job.status === "done" || job.status === "cancelled") return this.view(job);
    const context = await this.context(job);
    const { rows, groups } = validateRows(job.rows, context);
    // Done rows keep their result: their product exists now, so they validate as updates.
    job.rows = rows.map((row, index) => ({
      ...row,
      result: job.rows[index]!.result,
      resultError: job.rows[index]!.resultError,
    }));
    const pendingErrors = job.rows.some(
      (row) => !row.skipped && row.result === "pending" && hasErrors(row),
    );
    if (pendingErrors) throw new DomainError("import.has_errors");
    job.status = "committing";

    const pendingGroups = groups.filter((group) =>
      group.rows.some((n) => job.rows.find((r) => r.rowNumber === n)?.result === "pending"),
    );
    for (const group of pendingGroups.slice(0, IMPORT_LIMITS.commitBatch)) {
      const outcome = await this.commitGroup(group, job, context, actor);
      for (const n of group.rows) {
        const row = job.rows.find((r) => r.rowNumber === n)!;
        row.result = outcome === null ? "done" : "failed";
        row.resultError = outcome;
      }
      await this.jobs.save(job);
    }
    if (pendingGroups.length <= IMPORT_LIMITS.commitBatch) {
      job.status = "done";
      await this.unitOfWork.run((tx: TxContext) =>
        this.audit.record(
          tx,
          {
            action: "product.import",
            actor: { userId: actor.userId, roles: actor.roles },
            target: { type: "import_job", id: job.id },
            requestId: actor.requestId,
            meta: {
              rows: job.rows.length,
              done: job.rows.filter((r) => r.result === "done").length,
              failed: job.rows.filter((r) => r.result === "failed").length,
            },
          },
          now,
        ),
      );
    }
    await this.jobs.save(job);
    return this.view(job);
  }

  /** `LAVIECO_mau-import-san-pham.xlsx`: two example rows and the column guide. */
  async template(): Promise<{ fileName: string; content: Buffer }> {
    const categories = await this.catalog.listCategories(false);
    const brands = await this.catalog.listBrands();
    const example = (sku: string, value: string, first: boolean): SheetCell[] =>
      IMPORT_COLUMNS.map((column) => EXAMPLE[column]?.(sku, value, first) ?? null);
    const book: Workbook = {
      fileName: "LAVIECO_mau-import-san-pham.xlsx",
      table: {
        name: "San pham",
        columns: IMPORT_COLUMNS.map(columnSpec),
        rows: [
          example("VIDU-POT-REU", "Xanh rêu", true),
          example("VIDU-POT-NAU", "Nâu đất", false),
        ],
      },
      summary: {
        name: "Huong dan",
        title: "Hướng dẫn import sản phẩm LAVIECO",
        lines: [
          ["Cách dùng", "Mỗi dòng là một biến thể (SKU). Các dòng cùng slug là một sản phẩm."],
          ["Dòng ví dụ", "SKU bắt đầu bằng VIDU- được bỏ qua. Xoá hoặc thay bằng dữ liệu thật."],
          [
            "Ảnh",
            "Ghi tên file ở cột anh (cách nhau bằng ;), hoặc đặt tên file <slug>-1.jpg, <slug>-2.jpg...",
          ],
          ["Ảnh theo biến thể", "Thêm @<giá trị> sau tên file, ví dụ chau-xanh.jpg@Xanh rêu"],
          ["Giá", "Số nguyên đồng, ví dụ 89000. gia_khuyen_mai thấp hơn gia thì gia bị gạch."],
          ["Tồn kho", "Khi cập nhật, ton_kho là số đếm lại (đặt lại), không phải số cộng thêm."],
          ["Tác động", "nhãn|giá trị|đơn vị|nguồn; ... (luôn chờ Super Admin duyệt)"],
          ["Trạng thái", "nhap, xuat_ban hoặc an"],
          ...IMPORT_COLUMNS.map((column): [string, SheetCell] => [column, GUIDE[column]]),
          ...categories.map((c): [string, SheetCell] => [`danh_muc: ${c.key}`, c.name]),
          ...brands.map((b): [string, SheetCell] => [`thuong_hieu_doi_tac: ${b.slug}`, b.name]),
        ],
      },
    };
    return { fileName: book.fileName, content: await this.workbook.write(book) };
  }

  /** Every non-archived product in the template format: export, edit, import as update. */
  async export(now = new Date()): Promise<{ fileName: string; content: Buffer }> {
    const [categories, brands] = await Promise.all([
      this.catalog.listCategories(true),
      this.catalog.listBrands(),
    ]);
    const categoryKey = new Map(categories.map((c) => [c.id, c.key]));
    const brandSlug = new Map(brands.map((b) => [b.id, b.slug]));
    const rows: SheetCell[][] = [];
    let cursor: string | undefined;
    do {
      const page = await this.products.list({ limit: 100, cursor });
      const variants = await this.products.variantsOf(page.items.map((p) => p.id));
      for (const product of page.items) {
        const active = (variants.get(product.id) ?? []).filter((v) => v.status === "active");
        active.forEach((variant, index) => {
          const first = index === 0;
          const values: Partial<Record<ImportColumn, SheetCell>> = {
            slug: product.slug,
            ten_san_pham: first ? product.title : null,
            danh_muc: first ? (categoryKey.get(product.categoryId) ?? "") : null,
            thuong_hieu_doi_tac:
              first && product.partnerBrandId
                ? (brandSlug.get(product.partnerBrandId) ?? "")
                : null,
            sku: variant.sku,
            gia: variant.compareAtPrice ?? variant.price,
            gia_khuyen_mai: variant.compareAtPrice !== null ? variant.price : null,
            ton_kho: Math.max(0, variant.stock.onHand),
            nguong_sap_het: variant.lowStockThreshold,
            chat_lieu: first ? product.materials.join("; ") : null,
            tom_tat: first ? product.summary : null,
            thong_diep: first ? product.story.message : null,
            cau_chuyen: first ? product.story.story : null,
            bai_hoc: first ? product.story.lesson : null,
            chuong_cam_nang: first ? (product.handbookLink?.slug ?? "") : null,
            ten_chuong_cam_nang: first ? (product.handbookLink?.title ?? "") : null,
            tac_dong: first
              ? product.impact.items
                  .map((i) => [i.label, i.value, i.unit, i.source].join("|"))
                  .join("; ")
              : null,
            trang_thai: first ? STATUS_TEXT[product.status] : null,
            seo_tieu_de: first ? product.seo.title : null,
            seo_mo_ta: first ? product.seo.description : null,
            thu_tu: first ? product.sortOrder : null,
          };
          product.options.forEach((option, n) => {
            const key = `tuy_chon_${n + 1}` as const;
            values[`${key}_ten` as ImportColumn] = first ? option.name : null;
            values[`${key}_gia_tri` as ImportColumn] =
              option.values.find((v) => v.key === variant.optionValues[option.key])?.label ?? "";
          });
          rows.push(IMPORT_COLUMNS.map((column) => values[column] ?? null));
        });
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
    const book: Workbook = {
      fileName: `LAVIECO_san-pham_${day}.xlsx`,
      table: { name: "San pham", columns: IMPORT_COLUMNS.map(columnSpec), rows },
    };
    return { fileName: book.fileName, content: await this.workbook.write(book) };
  }

  // ------------------------------------------------------------------ helpers

  private async load(id: string) {
    const job = await this.jobs.find(id);
    if (!job) throw new DomainError("common.not_found");
    return job;
  }

  private async editable(id: string) {
    const job = await this.load(id);
    if (job.status !== "ready") throw new DomainError("import.locked");
    return job;
  }

  private async revalidate(job: ImportJobRecord) {
    const { rows } = validateRows(job.rows, await this.context(job));
    job.rows = rows;
    await this.jobs.save(job);
    return this.view(job);
  }

  private async context(job: ImportJobRecord): Promise<ImportContext> {
    const [categories, brands] = await Promise.all([
      this.catalog.listCategories(false),
      this.catalog.listBrands(),
    ]);
    const slugs = [
      ...new Set(job.rows.map((row) => (row.raw.slug ?? "").trim().toLowerCase()).filter(Boolean)),
    ];
    const products = new Map<string, { id: string; skus: Set<string> }>();
    for (const slug of slugs) {
      const product = await this.products.findBySlug(slug);
      if (product && product.slug === slug) products.set(slug, { id: product.id, skus: new Set() });
    }
    const skus = [
      ...new Set(job.rows.map((row) => (row.raw.sku ?? "").trim().toUpperCase()).filter(Boolean)),
    ];
    const owned = await this.products.findVariantsBySku(skus);
    return {
      mode: job.mode,
      categoryIdByKey: new Map(categories.map((c) => [c.key, c.id])),
      brandIdBySlug: new Map(brands.map((b) => [b.slug, b.id])),
      products,
      skuOwner: new Map(owned.map((v) => [v.sku, v.productId])),
      imageFiles: job.imageFiles,
    };
  }

  /** Null when saved; otherwise the error code, kept on the rows of the group. */
  private async commitGroup(
    group: BuiltGroup,
    job: ImportJobRecord,
    context: ImportContext,
    actor: ImportActor,
  ): Promise<string | null> {
    if (!group.request) return "common.validation_failed";
    try {
      const existing = context.products.get(group.slug);
      let bundle;
      if (!existing) {
        bundle = await this.productAdmin.create(group.request, actor);
      } else {
        const current = await this.productAdmin.get(existing.id);
        bundle = await this.productAdmin.update(
          existing.id,
          {
            ...this.merge(group.request, current, job.removedImages[group.slug] ?? []),
            revision: current.product.revision,
          },
          actor,
        );
        // `ton_kho` of an existing variant is a count: set it, never below what is held.
        for (const variant of current.variants) {
          const count = group.stockBySku.get(variant.sku);
          if (count !== undefined && count !== variant.stock.onHand) {
            await this.productAdmin.adjustStock(
              variant.id,
              { mode: "set", quantity: count, reason: "Import" },
              actor,
            );
          }
        }
        bundle = await this.productAdmin.get(existing.id);
      }
      if (group.status !== bundle.product.status && group.status !== "draft") {
        await this.productAdmin
          .setStatus(
            bundle.product.id,
            { status: group.status, revision: bundle.product.revision },
            actor,
          )
          .catch(() => undefined); // BR-20 not met: the product stays a draft (already warned).
      }
      return null;
    } catch (error) {
      return error instanceof DomainError ? error.code : "common.internal";
    }
  }

  /**
   * An update keeps what the file does not mention: variants missing from it, and the
   * current images except those the admin dropped; new images are appended (17/11 decision).
   */
  private merge(
    request: ProductCreateRequest,
    current: Awaited<ReturnType<ProductAdminService["get"]>>,
    removed: readonly string[],
  ): ProductCreateRequest {
    const bySku = new Map(current.variants.map((v) => [v.sku, v]));
    const inFile = new Set(request.variants.map((v) => v.sku));
    const variants = [
      ...request.variants.map((v) => {
        const known = bySku.get(v.sku);
        return known ? { ...v, id: known.id, initialStock: 0 } : v;
      }),
      ...current.variants
        .filter((v) => v.status === "active" && !inFile.has(v.sku))
        .map((v) => ({
          id: v.id,
          sku: v.sku,
          optionValues: v.optionValues,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          lowStockThreshold: v.lowStockThreshold,
          weightGrams: v.weightGrams,
          active: true,
          madeToOrder: v.madeToOrder,
          initialStock: 0,
        })),
    ];
    const kept = current.product.images
      .filter((image) => !removed.includes(image.mediaId))
      .map((image) => ({
        mediaId: image.mediaId,
        alt: image.alt,
        variantValues: image.variantValues,
      }));
    const keptIds = new Set(kept.map((image) => image.mediaId));
    const images = [...kept, ...request.images.filter((image) => !keptIds.has(image.mediaId))];
    return {
      ...request,
      options: request.options.length > 0 ? request.options : current.product.options,
      variants,
      images,
      handbookLink: request.handbookLink ?? current.product.handbookLink,
    };
  }

  private view(job: ImportJobRecord) {
    const active = job.rows.filter((row) => !row.skipped);
    const wanted = [...validateRowsWanted(job)];
    return {
      id: job.id,
      fileName: job.fileName,
      mode: job.mode,
      status: job.status,
      rows: job.rows.map((row) => ({
        rowNumber: row.rowNumber,
        slug: row.slug,
        raw: row.raw,
        issues: row.issues,
        action: row.action,
        skipped: row.skipped,
        result: row.result,
        resultError: row.resultError,
      })),
      imageFiles: job.imageFiles,
      wantedImages: wanted,
      existingImages: [] as {
        slug: string;
        images: { mediaId: string; publicId: string; alt: string }[];
      }[],
      removedImages: job.removedImages,
      counts: {
        rows: job.rows.length,
        errors: active.filter((row) => hasErrors(row)).length,
        warnings: active.filter((row) => !hasErrors(row) && row.issues.length > 0).length,
        skipped: job.rows.length - active.length,
        products: new Set(active.map((row) => row.slug)).size,
        done: job.rows.filter((row) => row.result === "done").length,
        failed: job.rows.filter((row) => row.result === "failed").length,
      },
      expiresAt: job.expiresAt.toISOString(),
    };
  }

  /** Current images of the products an update would change (for the × / remove-all panel). */
  async withExistingImages<T extends { rows: { slug: string; action: string | null }[] }>(view: T) {
    const slugs = [...new Set(view.rows.filter((r) => r.action === "update").map((r) => r.slug))];
    const existingImages = [];
    for (const slug of slugs.slice(0, 200)) {
      const product = await this.products.findBySlug(slug);
      if (product) {
        existingImages.push({
          slug,
          images: product.images.map((i) => ({
            mediaId: i.mediaId,
            publicId: i.publicId,
            alt: i.alt,
          })),
        });
      }
    }
    return { ...view, existingImages };
  }
}

/** File names each group asks for, from column `anh` (the convention needs the uploads). */
function* validateRowsWanted(job: ImportJobRecord) {
  const seen = new Set<string>();
  for (const row of job.rows) {
    if (row.skipped) continue;
    for (const part of (row.raw.anh ?? "").split(";")) {
      const name = part.split("@")[0]!.trim();
      const key = `${row.slug}|${name}`;
      if (name && !seen.has(key)) {
        seen.add(key);
        yield { slug: row.slug, fileName: name };
      }
    }
  }
}

function columnSpec(column: ImportColumn): SheetColumn {
  if (["gia", "gia_khuyen_mai", "ton_kho", "nguong_sap_het", "thu_tu"].includes(column)) {
    return { header: column, kind: "number" };
  }
  if (
    ["tom_tat", "thong_diep", "cau_chuyen", "bai_hoc", "tac_dong", "anh", "seo_mo_ta"].includes(
      column,
    )
  ) {
    return { header: column, kind: "longText" };
  }
  return { header: column, kind: column === "sku" || column === "slug" ? "code" : "text" };
}

const GUIDE: Record<ImportColumn, string> = {
  slug: "Bắt buộc. Đường dẫn sản phẩm, chữ thường không dấu: chau-gom-mam-xanh. Khoá khớp khi cập nhật.",
  ten_san_pham: "Bắt buộc ở dòng đầu của sản phẩm. Tối đa 120 ký tự.",
  danh_muc: "Bắt buộc. Mã danh mục (xem cuối sheet này).",
  thuong_hieu_doi_tac: "Để trống nếu là sản phẩm LAVIECO. Mã thương hiệu (xem cuối sheet).",
  sku: "Bắt buộc, duy nhất. Chữ, số, dấu gạch: LV-POT-01-REU. Khoá khớp biến thể.",
  tuy_chon_1_ten: "Tên phân loại 1, ví dụ Màu (ghi ở dòng đầu).",
  tuy_chon_1_gia_tri: "Giá trị phân loại 1 của dòng này, ví dụ Xanh rêu.",
  tuy_chon_2_ten: "Tên phân loại 2 (nếu có).",
  tuy_chon_2_gia_tri: "Giá trị phân loại 2.",
  tuy_chon_3_ten: "Tên phân loại 3 (nếu có).",
  tuy_chon_3_gia_tri: "Giá trị phân loại 3.",
  gia: "Bắt buộc. Giá niêm yết (đồng).",
  gia_khuyen_mai: "Không bắt buộc. Thấp hơn gia; khi có, gia hiện gạch ngang.",
  ton_kho: "Số lượng trong kho.",
  nguong_sap_het: "Báo sắp hết khi còn từng này (mặc định 3).",
  chat_lieu: "Cách nhau bằng ;",
  tom_tat: "Mô tả ngắn, tối đa 300 ký tự.",
  thong_diep: "Story card: thông điệp (cần để xuất bản).",
  cau_chuyen: "Story card: câu chuyện (cần để xuất bản).",
  bai_hoc: "Story card: bài học (cần để xuất bản).",
  chuong_cam_nang: "Slug chương Cẩm nang liên kết (cần để xuất bản).",
  ten_chuong_cam_nang: "Tên chương Cẩm nang.",
  tac_dong: "nhãn|giá trị|đơn vị|nguồn; ...",
  anh: "Tên file ảnh theo thứ tự, cách nhau bằng ; (ảnh đầu là ảnh đại diện).",
  alt_anh: "Mô tả từng ảnh theo thứ tự, cách nhau bằng ;",
  trang_thai: "nhap (mặc định), xuat_ban hoặc an.",
  seo_tieu_de: "Tối đa 60 ký tự.",
  seo_mo_ta: "Tối đa 160 ký tự.",
  thu_tu: "Số nhỏ hiện trước.",
};

const EXAMPLE: Partial<
  Record<ImportColumn, (sku: string, value: string, first: boolean) => SheetCell>
> = {
  slug: () => "chau-gom-mam-xanh",
  ten_san_pham: (_s, _v, first) => (first ? "Chậu gốm vỏ sò Mầm Xanh" : null),
  danh_muc: (_s, _v, first) => (first ? "gom-bot-vo-so" : null),
  sku: (sku) => sku,
  tuy_chon_1_ten: (_s, _v, first) => (first ? "Màu" : null),
  tuy_chon_1_gia_tri: (_s, value) => value,
  gia: () => 115000,
  gia_khuyen_mai: () => 89000,
  ton_kho: () => 12,
  chat_lieu: (_s, _v, first) => (first ? "Bột vỏ sò; Jesmonite" : null),
  tom_tat: (_s, _v, first) => (first ? "Chậu cây nhỏ đúc từ bột vỏ sò thu gom tại Cần Thơ." : null),
  thong_diep: (_s, _v, first) => (first ? "Phế liệu có thể trở thành vật dụng đẹp." : null),
  cau_chuyen: (_s, _v, first) =>
    first ? "Vỏ sò từ quán ăn được làm sạch, nghiền và đúc thủ công." : null,
  bai_hoc: (_s, _v, first) =>
    first ? "Phân loại rác tại nguồn giúp vật liệu có đời sống mới." : null,
  chuong_cam_nang: (_s, _v, first) => (first ? "vo-so-di-dau" : null),
  ten_chuong_cam_nang: (_s, _v, first) => (first ? "Vỏ sò đi đâu?" : null),
  anh: (_s, value, first) =>
    first
      ? "chau-gom-mam-xanh-1.jpg; chau-xanh-reu.jpg@Xanh rêu"
      : value === "Nâu đất"
        ? "chau-nau-dat.jpg@Nâu đất"
        : null,
  trang_thai: (_s, _v, first) => (first ? "nhap" : null),
};
