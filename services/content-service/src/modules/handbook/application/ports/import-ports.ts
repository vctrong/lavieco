import type { TxContext } from "@lavieco/service-kit/ports";
import type {
  HandbookImportMode,
  HandbookImportStatus,
  HandbookUploadKind,
} from "@lavieco/shared/content";

export const UPLOAD_REPOSITORY = Symbol("UPLOAD_REPOSITORY");
export const IMPORT_JOB_REPOSITORY = Symbol("IMPORT_JOB_REPOSITORY");
export const UPLOAD_STORE = Symbol("UPLOAD_STORE");
export const PDF_RENDERER = Symbol("PDF_RENDERER");
export const TEXT_EXTRACTOR = Symbol("TEXT_EXTRACTOR");

/** A file sent in chunks (`handbook_uploads`); the bytes live in the `UploadStore`. */
export type UploadRecord = {
  id: string;
  handbookId: string;
  kind: HandbookUploadKind;
  fileName: string;
  size: number;
  chunkBytes: number;
  chunks: number;
  receivedChunks: number;
  createdBy: string;
  consumed: boolean;
  createdAt: Date;
};

export interface UploadRepository {
  newId(): string;
  insert(
    upload: Omit<UploadRecord, "receivedChunks" | "consumed" | "createdAt">,
  ): Promise<UploadRecord>;
  find(id: string): Promise<UploadRecord | null>;
  /** `receivedChunks` from `index` to `index + 1`; false when another chunk won. */
  advance(id: string, index: number): Promise<boolean>;
  /** Marks the uploads as used by an import; false when one was already used. */
  markConsumed(ids: readonly string[], tx: TxContext): Promise<boolean>;
}

export type ImportWarning = {
  code: "aspect_off" | "missing_text" | "low_text_ratio";
  page: number | null;
};

export type ImportError =
  | "file_invalid"
  | "pdf_encrypted"
  | "pdf_tools_missing"
  | "too_many_pages"
  | "draft_changed"
  | "internal";

/** `handbook_import_jobs`: processed one at a time, in order (risks: queue on 2 vCPU). */
export type ImportJobRecord = {
  id: string;
  handbookId: string;
  draftVersionId: string;
  uploadIds: string[];
  mode: HandbookImportMode;
  pageId: string | null;
  chapterId: string | null;
  status: HandbookImportStatus;
  total: number;
  done: number;
  warnings: ImportWarning[];
  error: ImportError | null;
  createdBy: string;
  createdAt: Date;
  finishedAt: Date | null;
};

export interface ImportJobRepository {
  insert(
    job: Omit<
      ImportJobRecord,
      "id" | "status" | "total" | "done" | "warnings" | "error" | "createdAt" | "finishedAt"
    >,
    tx: TxContext,
  ): Promise<ImportJobRecord>;
  find(id: string): Promise<ImportJobRecord | null>;
  listRecent(handbookId: string, limit: number): Promise<ImportJobRecord[]>;
  /** Jobs queued before this one (its place in line is that + 1). */
  countQueuedBefore(createdAt: Date, id: string): Promise<number>;
  /**
   * Takes the oldest queued job, or a running one whose lease expired (a crashed
   * worker), and leases it until `leaseUntil`.
   */
  claimNext(now: Date, leaseUntil: Date): Promise<ImportJobRecord | null>;
  progress(id: string, update: { total?: number; done: number; leaseUntil: Date }): Promise<void>;
  finish(
    id: string,
    outcome: { status: "done" | "failed"; warnings: ImportWarning[]; error: ImportError | null },
    at: Date,
  ): Promise<void>;
}

/** Where uploaded files wait to be imported (a local folder, a volume in production). */
export interface UploadStore {
  /** Writes `bytes` at `offset` of the upload's file (creating it on the first chunk). */
  write(uploadId: string, offset: number, bytes: Uint8Array): Promise<void>;
  /** Absolute path for tools that read files (poppler). */
  pathOf(uploadId: string): string;
  read(uploadId: string): Promise<Uint8Array>;
  size(uploadId: string): Promise<number>;
  remove(uploadId: string): Promise<void>;
  /** Removes files older than `cutoff`; returns how many. */
  sweep(cutoff: Date): Promise<number>;
}

/** The PDF tools are not installed on this server (poppler). Images still import. */
export class PdfToolsMissingError extends Error {
  override name = "PdfToolsMissingError";
}

export class PdfInvalidError extends Error {
  override name = "PdfInvalidError";
  constructor(readonly reason: "file_invalid" | "pdf_encrypted") {
    super(reason);
  }
}

/** Turns PDF pages into images (poppler in production, ADR-0029). */
export interface PdfRenderer {
  /** Page count; throws `PdfInvalidError` for a broken or encrypted file. */
  inspect(path: string): Promise<{ pages: number }>;
  /** One page as image bytes (PNG or JPEG), 1748 px wide (A5 at 300 dpi). */
  renderPage(path: string, page: number): Promise<Uint8Array>;
}

/**
 * Finds the text of a page, for search, SEO and LaviAgent. PDF pages give their text
 * layer; images give nothing yet. OCR plugs in here later (TODO(handbook-ocr)) without
 * touching the import flow.
 */
export interface TextExtractor {
  fromPdfPage(path: string, page: number): Promise<string>;
  fromImage(bytes: Uint8Array): Promise<string>;
}
