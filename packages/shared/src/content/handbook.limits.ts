/**
 * Digital Green Handbook (ADR-0029): designed A5 pages uploaded as a PDF or images,
 * versioned as a whole book. Shared so admin pickers, the service and the reader use
 * the very same numbers.
 */

const MB = 1024 * 1024;

export const HANDBOOK_LIMITS = {
  /** Pages of one version (one Mongo document stays well under 2 MB). */
  pagesMax: 300,
  chaptersMax: 30,
  hotspotsPerPageMax: 20,
  titleMax: 120,
  descriptionMax: 400,
  /** Characters of extracted or typed text per page (search, SEO, LaviAgent). */
  textMax: 8_000,
  hotspotLabelMax: 80,
  laviagentPromptMax: 200,
  urlMax: 500,
  /** Release note required on every publish (D1). */
  noteMin: 3,
  noteMax: 300,
  /** Upload limits: a whole book as PDF, or one page image. */
  pdfMaxBytes: 200 * MB,
  imageMaxBytes: 25 * MB,
  /** Files of one import (images). */
  importFilesMax: 300,
  /**
   * Chunk of a chunked upload: below the 10 MB request cap of Caddy and Next's proxy
   * on admin, with room for the multipart envelope.
   */
  chunkBytes: 6 * MB,
  /** Versions whose images are kept besides the published one and the draft. */
  keptVersions: 3,
  /** A5 portrait: height / width = √2. */
  aspectRatio: Math.SQRT2,
  /** Warn (never block) when a page is further than this from A5. */
  aspectTolerance: 0.03,
  /** Fewer characters than this: the page is flagged "Thiếu chữ". */
  textMinChars: 20,
  /** Below this share of pages with text, publishing warns about search and SEO. */
  lowTextRatio: 0.5,
  /** Search query length. */
  queryMin: 2,
  queryMax: 80,
  searchResultsMax: 40,
} as const;

/** Recommended page size for designers: A5 at 300 dpi. */
export const HANDBOOK_PAGE_PIXELS = { width: 1748, height: 2480 } as const;

/** Paper tab colours at the edge of the book; each maps to a design token. */
export const HANDBOOK_CHAPTER_TINTS = ["mint", "canary", "paper", "emerald", "deep-blue"] as const;
export type HandbookChapterTint = (typeof HANDBOOK_CHAPTER_TINTS)[number];

export const HANDBOOK_VERSION_STATUSES = ["draft", "published", "archived"] as const;
export type HandbookVersionStatus = (typeof HANDBOOK_VERSION_STATUSES)[number];

export const HANDBOOK_TEXT_SOURCES = ["pdf", "manual", "none"] as const;
export type HandbookTextSource = (typeof HANDBOOK_TEXT_SOURCES)[number];

export const HANDBOOK_HOTSPOT_TYPES = ["product", "page", "video", "url", "laviagent"] as const;
export type HandbookHotspotType = (typeof HANDBOOK_HOTSPOT_TYPES)[number];

/** How an import lands in the draft. */
export const HANDBOOK_IMPORT_MODES = ["append", "replace_all", "replace_page"] as const;
export type HandbookImportMode = (typeof HANDBOOK_IMPORT_MODES)[number];

export const HANDBOOK_IMPORT_STATUSES = ["queued", "running", "done", "failed"] as const;
export type HandbookImportStatus = (typeof HANDBOOK_IMPORT_STATUSES)[number];

export const HANDBOOK_UPLOAD_KINDS = ["pdf", "image"] as const;
export type HandbookUploadKind = (typeof HANDBOOK_UPLOAD_KINDS)[number];

/** Slug of the one handbook of phase 1. */
export const HANDBOOK_DEFAULT_SLUG = "cam-nang-xanh-so";

/** Cache tags of the public handbook (docs/04 §5): revalidated on every publish. */
export const HANDBOOK_CACHE_TAG = "content:handbook";
