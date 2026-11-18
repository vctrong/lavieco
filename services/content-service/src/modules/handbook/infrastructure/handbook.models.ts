import { MongooseModule } from "@nestjs/mongoose";
import { Schema } from "mongoose";

import {
  HANDBOOK_CHAPTER_KINDS,
  HANDBOOK_CHAPTER_TINTS,
  HANDBOOK_IMPORT_MODES,
  HANDBOOK_IMPORT_STATUSES,
  HANDBOOK_TEXT_SOURCES,
  HANDBOOK_UPLOAD_KINDS,
  HANDBOOK_VERSION_STATUSES,
} from "@lavieco/shared/content";

export const HANDBOOK_MODEL = "Handbook";
export const HANDBOOK_VERSION_MODEL = "HandbookVersion";
export const HANDBOOK_UPLOAD_MODEL = "HandbookUpload";
export const HANDBOOK_IMPORT_JOB_MODEL = "HandbookImportJob";
export const HANDBOOK_PREVIEW_TOKEN_MODEL = "HandbookPreviewToken";

/** `handbooks` (docs/03 §5.1, ADR-0029): stable fields and the version pointers. */
export const handbookSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    slug: { type: String, required: true },
    accessLevel: {
      type: String,
      required: true,
      enum: ["free", "member", "premium"],
      default: "free",
    },
    publishedVersionId: { type: Schema.Types.ObjectId, default: null },
    draftVersionId: { type: Schema.Types.ObjectId, default: null },
    lastNumber: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
  },
  { collection: "handbooks", timestamps: true },
);
handbookSchema.index({ slug: 1 }, { name: "idx_handbooks_slug_uq", unique: true });

const actorSchema = new Schema(
  { userId: { type: String, required: true }, name: { type: String, default: "" } },
  { _id: false },
);

const chapterSchema = new Schema(
  {
    id: { type: String, required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    tint: { type: String, required: true, enum: HANDBOOK_CHAPTER_TINTS },
    // Versions written before covers/kinds read as "content" (no migration needed).
    kind: { type: String, enum: HANDBOOK_CHAPTER_KINDS, default: "content" },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    mediaId: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

const pageSchema = new Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    chapterId: { type: String, required: true },
    title: { type: String, required: true },
    alt: { type: String, default: "" },
    image: {
      type: new Schema(
        {
          mediaId: { type: String, required: true },
          publicId: { type: String, required: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    text: { type: String, default: "" },
    textSource: { type: String, required: true, enum: HANDBOOK_TEXT_SOURCES },
    // Validated by Zod on the way in (handbookHotspotSchema); stored as given.
    hotspots: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

/**
 * `handbook_versions`: one document per version, a full snapshot of chapters and pages
 * (≤ 300 pages, ≤ 8 000 characters of text each). Exactly one draft per handbook,
 * enforced by a partial unique index on the `status: "draft"` equality.
 */
export const handbookVersionSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    handbookId: { type: Schema.Types.ObjectId, required: true },
    number: { type: Number, required: true },
    status: { type: String, required: true, enum: HANDBOOK_VERSION_STATUSES },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    note: { type: String, default: "" },
    basedOnNumber: { type: Number, default: null },
    revision: { type: Number, required: true, default: 1 },
    covers: {
      type: new Schema(
        { front: { type: imageSchema, default: null }, back: { type: imageSchema, default: null } },
        { _id: false },
      ),
      default: () => ({ front: null, back: null }),
    },
    chapters: { type: [chapterSchema], default: [] },
    pages: { type: [pageSchema], default: [] },
    createdBy: { type: actorSchema, required: true },
    publishedBy: { type: actorSchema, default: null },
    publishedAt: { type: Date, default: null },
  },
  { collection: "handbook_versions", timestamps: true },
);
handbookVersionSchema.index(
  { handbookId: 1, number: -1 },
  { name: "idx_handbook_versions_handbook_id_number_uq", unique: true },
);
handbookVersionSchema.index(
  { handbookId: 1 },
  {
    name: "idx_handbook_versions_draft_uq",
    unique: true,
    partialFilterExpression: { status: "draft" },
  },
);

/** `handbook_uploads`: chunked uploads; the bytes live on disk (UploadStore). TTL 2 days. */
export const handbookUploadSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    handbookId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, required: true, enum: HANDBOOK_UPLOAD_KINDS },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    chunkBytes: { type: Number, required: true },
    chunks: { type: Number, required: true },
    receivedChunks: { type: Number, required: true, default: 0 },
    consumed: { type: Boolean, required: true, default: false },
    createdBy: { type: String, required: true },
  },
  { collection: "handbook_uploads", timestamps: true },
);
handbookUploadSchema.index(
  { createdAt: 1 },
  { name: "idx_handbook_uploads_created_at_ttl", expireAfterSeconds: 2 * 24 * 60 * 60 },
);

/** `handbook_import_jobs`: one at a time, oldest first, leased while running. TTL 30 days. */
export const handbookImportJobSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    handbookId: { type: Schema.Types.ObjectId, required: true },
    draftVersionId: { type: String, required: true },
    uploadIds: { type: [String], required: true },
    mode: { type: String, required: true, enum: HANDBOOK_IMPORT_MODES },
    pageId: { type: String, default: null },
    chapterId: { type: String, default: null },
    status: { type: String, required: true, enum: HANDBOOK_IMPORT_STATUSES },
    total: { type: Number, required: true, default: 0 },
    done: { type: Number, required: true, default: 0 },
    warnings: {
      type: [
        new Schema(
          { code: { type: String, required: true }, page: { type: Number, default: null } },
          { _id: false },
        ),
      ],
      default: [],
    },
    error: { type: String, default: null },
    leaseUntil: { type: Date, default: null },
    createdBy: { type: String, required: true },
    finishedAt: { type: Date, default: null },
  },
  { collection: "handbook_import_jobs", timestamps: true },
);
handbookImportJobSchema.index(
  { status: 1, createdAt: 1 },
  { name: "idx_handbook_import_jobs_status_created_at" },
);
handbookImportJobSchema.index(
  { handbookId: 1, createdAt: -1 },
  { name: "idx_handbook_import_jobs_handbook_id_created_at" },
);
handbookImportJobSchema.index(
  { createdAt: 1 },
  { name: "idx_handbook_import_jobs_created_at_ttl", expireAfterSeconds: 30 * 24 * 60 * 60 },
);

/** `handbook_preview_tokens`: hash only, 10 minutes, removed by TTL. */
export const handbookPreviewTokenSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, default: 1 },
    tokenHash: { type: String, required: true },
    versionId: { type: Schema.Types.ObjectId, required: true },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "handbook_preview_tokens", timestamps: true },
);
handbookPreviewTokenSchema.index(
  { tokenHash: 1 },
  { name: "idx_handbook_preview_tokens_token_hash_uq", unique: true },
);
handbookPreviewTokenSchema.index(
  { expiresAt: 1 },
  { name: "idx_handbook_preview_tokens_expires_at_ttl", expireAfterSeconds: 0 },
);

export const handbookPersistence = MongooseModule.forFeature([
  { name: HANDBOOK_MODEL, schema: handbookSchema },
  { name: HANDBOOK_VERSION_MODEL, schema: handbookVersionSchema },
  { name: HANDBOOK_UPLOAD_MODEL, schema: handbookUploadSchema },
  { name: HANDBOOK_IMPORT_JOB_MODEL, schema: handbookImportJobSchema },
  { name: HANDBOOK_PREVIEW_TOKEN_MODEL, schema: handbookPreviewTokenSchema },
]);
