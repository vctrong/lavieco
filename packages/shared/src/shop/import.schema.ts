import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";

/**
 * Bulk import of products (UC-39, docs/08 §8). One row per variant (SKU); rows sharing a
 * `slug` are one product. The column keys are the template's headers.
 */
export const IMPORT_COLUMNS = [
  "slug",
  "ten_san_pham",
  "danh_muc",
  "thuong_hieu_doi_tac",
  "sku",
  "tuy_chon_1_ten",
  "tuy_chon_1_gia_tri",
  "tuy_chon_2_ten",
  "tuy_chon_2_gia_tri",
  "tuy_chon_3_ten",
  "tuy_chon_3_gia_tri",
  "gia",
  "gia_khuyen_mai",
  "ton_kho",
  "nguong_sap_het",
  "chat_lieu",
  "tom_tat",
  "thong_diep",
  "cau_chuyen",
  "bai_hoc",
  "chuong_cam_nang",
  "ten_chuong_cam_nang",
  "tac_dong",
  "anh",
  "alt_anh",
  "trang_thai",
  "seo_tieu_de",
  "seo_mo_ta",
  "thu_tu",
] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  rows: 2_000,
  images: 2_000,
  cellMax: 2_000,
  /** Product groups committed per call; the client calls again until done. */
  commitBatch: 20,
} as const;

export const IMPORT_MODES = ["create", "update", "upsert"] as const;
export const importModeSchema = z.enum(IMPORT_MODES);
export type ImportMode = z.infer<typeof importModeSchema>;

export const IMPORT_JOB_STATUSES = ["ready", "committing", "done", "cancelled"] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

/** Codes shown in Vietnamese by the admin; `column` points at the faulty cell. */
export const IMPORT_ISSUE_CODES = [
  "required",
  "invalid",
  "too_long",
  "category_unknown",
  "brand_unknown",
  "slug_exists",
  "slug_missing",
  "sku_duplicate_in_file",
  "sku_taken",
  "option_mismatch",
  "price_invalid",
  "group_conflict",
  "image_missing",
  "too_many_images",
  "publish_incomplete",
] as const;
export const importIssueCodeSchema = z.enum(IMPORT_ISSUE_CODES);
export type ImportIssueCode = z.infer<typeof importIssueCodeSchema>;

export const importIssueSchema = z.object({
  column: z.string(),
  code: importIssueCodeSchema,
  severity: z.enum(["error", "warning"]),
});
export type ImportIssue = z.infer<typeof importIssueSchema>;

export const importRowSchema = z.object({
  rowNumber: z.number().int(),
  slug: z.string(),
  raw: z.record(z.string(), z.string()),
  issues: z.array(importIssueSchema),
  action: z.enum(["create", "update"]).nullable(),
  skipped: z.boolean(),
  result: z.enum(["pending", "done", "failed"]),
  resultError: z.string().nullable(),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export const importImageFileSchema = z.object({
  fileName: z.string(),
  mediaId: objectIdSchema,
  publicId: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});
export type ImportImageFile = z.infer<typeof importImageFileSchema>;

/** Current images of the products an update touches, so the admin can drop some. */
export const importExistingImagesSchema = z.object({
  slug: z.string(),
  images: z.array(z.object({ mediaId: objectIdSchema, publicId: z.string(), alt: z.string() })),
});

export const importJobSchema = z.object({
  id: objectIdSchema,
  fileName: z.string(),
  mode: importModeSchema,
  status: z.enum(IMPORT_JOB_STATUSES),
  rows: z.array(importRowSchema),
  imageFiles: z.array(importImageFileSchema),
  /** File names the rows ask for (column `anh` or the `<slug>-<n>` convention). */
  wantedImages: z.array(z.object({ slug: z.string(), fileName: z.string() })),
  existingImages: z.array(importExistingImagesSchema),
  /** Current images the admin chose to drop, per product slug. */
  removedImages: z.record(z.string(), z.array(objectIdSchema)),
  counts: z.object({
    rows: z.number().int(),
    errors: z.number().int(),
    warnings: z.number().int(),
    skipped: z.number().int(),
    products: z.number().int(),
    done: z.number().int(),
    failed: z.number().int(),
  }),
  expiresAt: isoDateTimeSchema,
});
export type ImportJob = z.infer<typeof importJobSchema>;

export const importRowUpdateRequestSchema = z.object({
  raw: z.record(z.string(), z.string().max(IMPORT_LIMITS.cellMax)),
});
export type ImportRowUpdateRequest = z.infer<typeof importRowUpdateRequestSchema>;

export const importRowSkipRequestSchema = z.object({ skipped: z.boolean() });

export const importImagesRequestSchema = z.object({
  files: z.array(importImageFileSchema).max(IMPORT_LIMITS.images),
});
export type ImportImagesRequest = z.infer<typeof importImagesRequestSchema>;

export const importRemovedImagesRequestSchema = z.object({
  slug: z.string().max(80),
  mediaIds: z.array(objectIdSchema).max(10),
});
export type ImportRemovedImagesRequest = z.infer<typeof importRemovedImagesRequestSchema>;
