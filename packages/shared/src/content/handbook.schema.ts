import { z } from "zod";

import { isoDateTimeSchema, objectIdSchema } from "../common/object-id";
import {
  HANDBOOK_CHAPTER_TINTS,
  HANDBOOK_IMPORT_MODES,
  HANDBOOK_IMPORT_STATUSES,
  HANDBOOK_LIMITS,
  HANDBOOK_TEXT_SOURCES,
  HANDBOOK_UPLOAD_KINDS,
  HANDBOOK_VERSION_STATUSES,
} from "./handbook.limits";
import { parseHandbookVideoUrl } from "./handbook-video";

const L = HANDBOOK_LIMITS;

const title = z.string().trim().min(1).max(L.titleMax);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

/** Short, random, never-reused key of a page: its public address (`/cam-nang/trang/<key>`). */
export const handbookPageKeySchema = z.string().regex(/^[0-9a-hjkmnp-tv-z]{8}$/);

export const handbookChapterTintSchema = z.enum(HANDBOOK_CHAPTER_TINTS);
export const handbookVersionStatusSchema = z.enum(HANDBOOK_VERSION_STATUSES);
export const handbookTextSourceSchema = z.enum(HANDBOOK_TEXT_SOURCES);
export const handbookImportModeSchema = z.enum(HANDBOOK_IMPORT_MODES);
export const handbookImportStatusSchema = z.enum(HANDBOOK_IMPORT_STATUSES);
export const handbookUploadKindSchema = z.enum(HANDBOOK_UPLOAD_KINDS);
export const handbookAccessLevelSchema = z.enum(["free", "member", "premium"]);
export type HandbookAccessLevel = z.infer<typeof handbookAccessLevelSchema>;

/** Who did it, as a snapshot (docs/03 §3): the name is taken from identity by the BFF. */
export const handbookActorSchema = z.object({
  userId: objectIdSchema,
  name: z.string().max(120),
});
export type HandbookActor = z.infer<typeof handbookActorSchema>;

export const handbookChapterSchema = z.object({
  /** UUID stable across versions. */
  id: z.uuid(),
  slug,
  title,
  tint: handbookChapterTintSchema,
});
export type HandbookChapter = z.infer<typeof handbookChapterSchema>;

const httpsUrl = z
  .url()
  .max(L.urlMax)
  .refine((value) => value.startsWith("https://"), { message: "Expected an https URL" });

/** Where a hotspot leads (ADR-0029). The product is a snapshot from program-service. */
export const handbookHotspotTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("product"),
    productId: objectIdSchema,
    slug: z.string().min(1).max(120),
    title: z.string().min(1).max(200),
  }),
  z.object({ type: z.literal("page"), pageId: z.uuid() }),
  z.object({
    type: z.literal("video"),
    url: httpsUrl.refine((value) => parseHandbookVideoUrl(value) !== null, {
      message: "Only YouTube and TikTok videos are accepted",
    }),
  }),
  z.object({ type: z.literal("url"), url: httpsUrl }),
  z.object({
    type: z.literal("laviagent"),
    prompt: z.string().trim().max(L.laviagentPromptMax).default(""),
  }),
]);
export type HandbookHotspotTarget = z.infer<typeof handbookHotspotTargetSchema>;

const percent = z.number().min(0).max(100);

/**
 * A clickable rectangle on a page, in percent of the page so it lands on the same
 * spot at every size. At least 2 % wide and high, never outside the page.
 */
export const handbookHotspotSchema = z
  .object({
    id: z.uuid(),
    x: percent,
    y: percent,
    w: z.number().min(2).max(100),
    h: z.number().min(2).max(100),
    label: z.string().trim().min(1).max(L.hotspotLabelMax),
    target: handbookHotspotTargetSchema,
  })
  .refine((spot) => spot.x + spot.w <= 100.001 && spot.y + spot.h <= 100.001, {
    message: "Hotspot must stay inside the page",
  });
export type HandbookHotspot = z.infer<typeof handbookHotspotSchema>;

export const handbookPageImageSchema = z.object({
  mediaId: objectIdSchema,
  publicId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type HandbookPageImage = z.infer<typeof handbookPageImageSchema>;

/** One page as the editor sees it. */
export const handbookPageSchema = z.object({
  /** UUID stable across versions (hotspots and bookmarks point to it). */
  id: z.uuid(),
  key: handbookPageKeySchema,
  chapterId: z.uuid(),
  title,
  alt: z.string().max(200),
  image: handbookPageImageSchema,
  text: z.string().max(L.textMax),
  textSource: handbookTextSourceSchema,
  hotspots: z.array(handbookHotspotSchema).max(L.hotspotsPerPageMax),
  /** Computed: fewer than `textMinChars` characters ("Thiếu chữ"). */
  missingText: z.boolean(),
  /** Computed: further than `aspectTolerance` from A5. */
  aspectOff: z.boolean(),
});
export type HandbookPage = z.infer<typeof handbookPageSchema>;

export const handbookVersionSchema = z.object({
  id: objectIdSchema,
  number: z.number().int().positive(),
  status: handbookVersionStatusSchema,
  title,
  description: z.string().max(L.descriptionMax),
  note: z.string(),
  basedOnNumber: z.number().int().positive().nullable(),
  revision: z.number().int().positive(),
  chapters: z.array(handbookChapterSchema).max(L.chaptersMax),
  pages: z.array(handbookPageSchema).max(L.pagesMax),
  createdBy: handbookActorSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  publishedBy: handbookActorSchema.nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
});
export type HandbookVersion = z.infer<typeof handbookVersionSchema>;

export const handbookVersionSummarySchema = z.object({
  id: objectIdSchema,
  number: z.number().int().positive(),
  status: handbookVersionStatusSchema,
  note: z.string(),
  pageCount: z.number().int().min(0),
  createdBy: handbookActorSchema,
  createdAt: isoDateTimeSchema,
  publishedBy: handbookActorSchema.nullable(),
  publishedAt: isoDateTimeSchema.nullable(),
  /** False once its images were cleaned up (only recent versions keep them). */
  restorable: z.boolean(),
});
export type HandbookVersionSummary = z.infer<typeof handbookVersionSummarySchema>;

/** `GET /internal/v1/handbook`: the back-office screen in one call. */
export const handbookOverviewSchema = z.object({
  id: objectIdSchema,
  slug: z.string(),
  accessLevel: handbookAccessLevelSchema,
  publishedNumber: z.number().int().positive().nullable(),
  draft: handbookVersionSchema.nullable(),
  published: handbookVersionSchema.nullable(),
  versions: z.array(handbookVersionSummarySchema),
});
export type HandbookOverview = z.infer<typeof handbookOverviewSchema>;

// --- editor requests ---

/** Every editing request names the draft revision it was made on (optimistic lock). */
const revision = z.number().int().positive();

/** Chapters and page order in one go (drag and drop); pages left out are removed. */
export const handbookStructureUpdateSchema = z.object({
  revision,
  title,
  description: z.string().trim().max(L.descriptionMax).default(""),
  chapters: z
    .array(
      z.object({
        id: z.uuid(),
        title,
        slug: slug.optional(),
        tint: handbookChapterTintSchema,
      }),
    )
    .min(1)
    .max(L.chaptersMax),
  pages: z.array(z.object({ id: z.uuid(), chapterId: z.uuid() })).max(L.pagesMax),
});
export type HandbookStructureUpdate = z.infer<typeof handbookStructureUpdateSchema>;

export const handbookPageUpdateSchema = z.object({
  revision,
  title,
  alt: z.string().trim().max(200).default(""),
  text: z.string().max(L.textMax),
  hotspots: z.array(handbookHotspotSchema).max(L.hotspotsPerPageMax),
});
export type HandbookPageUpdate = z.infer<typeof handbookPageUpdateSchema>;

export const handbookRevisionRequestSchema = z.object({ revision });
export type HandbookRevisionRequest = z.infer<typeof handbookRevisionRequestSchema>;

const note = z.string().trim().min(L.noteMin).max(L.noteMax);

/** Publishing always carries a short release note (D1). */
export const handbookPublishRequestSchema = z.object({
  revision,
  note,
  /** Name of the publisher for the team alert and history (from identity, via the BFF). */
  actorName: z.string().trim().min(1).max(120),
});
export type HandbookPublishRequest = z.infer<typeof handbookPublishRequestSchema>;

/** Restoring an old version publishes a copy of it; a draft in progress is dropped. */
export const handbookRestoreRequestSchema = z.object({
  number: z.number().int().positive(),
  note,
  actorName: z.string().trim().min(1).max(120),
  discardDraft: z.boolean().default(false),
});
export type HandbookRestoreRequest = z.infer<typeof handbookRestoreRequestSchema>;

/** Starts a draft from the published version (or an empty book). */
export const handbookDraftCreateSchema = z.object({
  actorName: z.string().trim().min(1).max(120),
});
export type HandbookDraftCreate = z.infer<typeof handbookDraftCreateSchema>;

/** One way to publish: the outcome lists what the editor should know. */
export const handbookPublishResultSchema = z.object({
  version: handbookVersionSummarySchema,
  warnings: z.array(z.enum(["low_text_ratio", "aspect_off"])),
});
export type HandbookPublishResult = z.infer<typeof handbookPublishResultSchema>;

// --- uploads and imports ---

export const handbookUploadCreateSchema = z
  .object({
    kind: handbookUploadKindSchema,
    fileName: z.string().trim().min(1).max(200),
    size: z.number().int().positive(),
  })
  .refine((upload) => upload.size <= (upload.kind === "pdf" ? L.pdfMaxBytes : L.imageMaxBytes), {
    message: "File is too large",
    path: ["size"],
  });
export type HandbookUploadCreate = z.infer<typeof handbookUploadCreateSchema>;

export const handbookUploadSchema = z.object({
  id: objectIdSchema,
  kind: handbookUploadKindSchema,
  size: z.number().int().positive(),
  chunkBytes: z.number().int().positive(),
  chunks: z.number().int().positive(),
  receivedChunks: z.number().int().min(0),
  complete: z.boolean(),
});
export type HandbookUpload = z.infer<typeof handbookUploadSchema>;

export const handbookImportCreateSchema = z
  .object({
    revision,
    uploadIds: z.array(objectIdSchema).min(1).max(L.importFilesMax),
    mode: handbookImportModeSchema,
    /** `replace_page`: the page whose image is replaced. */
    pageId: z.uuid().optional(),
    /** `append`: the chapter new pages go into (the last one when absent). */
    chapterId: z.uuid().optional(),
  })
  .refine((input) => input.mode !== "replace_page" || input.pageId !== undefined, {
    message: "pageId is required to replace a page",
    path: ["pageId"],
  })
  .refine((input) => input.mode !== "replace_page" || input.uploadIds.length === 1, {
    message: "A page is replaced by exactly one file",
    path: ["uploadIds"],
  });
export type HandbookImportCreate = z.infer<typeof handbookImportCreateSchema>;

export const HANDBOOK_IMPORT_WARNINGS = ["aspect_off", "missing_text", "low_text_ratio"] as const;

export const HANDBOOK_IMPORT_ERRORS = [
  "file_invalid",
  "pdf_encrypted",
  "too_many_pages",
  "draft_changed",
  "internal",
] as const;

export const handbookImportJobSchema = z.object({
  id: objectIdSchema,
  status: handbookImportStatusSchema,
  mode: handbookImportModeSchema,
  /** 1 = next to run; null when not waiting. */
  queuePosition: z.number().int().positive().nullable(),
  total: z.number().int().min(0),
  done: z.number().int().min(0),
  warnings: z.array(
    z.object({
      code: z.enum(HANDBOOK_IMPORT_WARNINGS),
      /** 1-based page number in the imported file, when it is about one page. */
      page: z.number().int().positive().nullable(),
    }),
  ),
  error: z.enum(HANDBOOK_IMPORT_ERRORS).nullable(),
  createdAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
});
export type HandbookImportJob = z.infer<typeof handbookImportJobSchema>;

export const handbookPreviewTokenSchema = z.object({
  token: z.string(),
  expiresAt: isoDateTimeSchema,
});
export type HandbookPreviewToken = z.infer<typeof handbookPreviewTokenSchema>;

// --- public (web, published only) ---

export const publicHandbookHotspotTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), slug: z.string(), title: z.string() }),
  z.object({ type: z.literal("page"), pageKey: handbookPageKeySchema, number: z.number().int() }),
  z.object({
    type: z.literal("video"),
    provider: z.enum(["youtube", "tiktok"]),
    videoId: z.string(),
  }),
  z.object({ type: z.literal("url"), url: z.string() }),
  z.object({ type: z.literal("laviagent"), prompt: z.string() }),
]);
export type PublicHandbookHotspotTarget = z.infer<typeof publicHandbookHotspotTargetSchema>;

export const publicHandbookHotspotSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string(),
  target: publicHandbookHotspotTargetSchema,
});
export type PublicHandbookHotspot = z.infer<typeof publicHandbookHotspotSchema>;

export const publicHandbookPageSchema = z.object({
  key: handbookPageKeySchema,
  /** 1-based position in the book. */
  number: z.number().int().positive(),
  chapterId: z.string(),
  title: z.string(),
  alt: z.string(),
  image: z.object({
    publicId: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  hasText: z.boolean(),
  hotspots: z.array(publicHandbookHotspotSchema),
});
export type PublicHandbookPage = z.infer<typeof publicHandbookPageSchema>;

export const publicHandbookChapterSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  tint: handbookChapterTintSchema,
  /** Number of its first page; chapters without pages are not published. */
  firstPage: z.number().int().positive(),
  pageCount: z.number().int().positive(),
});
export type PublicHandbookChapter = z.infer<typeof publicHandbookChapterSchema>;

/** The whole published book without page text (text comes per page or by search). */
export const publicHandbookSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  accessLevel: handbookAccessLevelSchema,
  versionNumber: z.number().int().positive(),
  publishedAt: isoDateTimeSchema,
  chapters: z.array(publicHandbookChapterSchema),
  pages: z.array(publicHandbookPageSchema),
});
export type PublicHandbook = z.infer<typeof publicHandbookSchema>;

const pageLink = z
  .object({ key: handbookPageKeySchema, number: z.number().int(), title: z.string() })
  .nullable();

/** One published page with its text: the SEO reading page, and LaviAgent's context. */
export const publicHandbookPageDetailSchema = z.object({
  page: publicHandbookPageSchema,
  text: z.string(),
  chapter: z.object({ id: z.string(), slug: z.string(), title: z.string() }),
  book: z.object({ title: z.string(), pageCount: z.number().int(), versionNumber: z.number() }),
  previous: pageLink,
  next: pageLink,
});
export type PublicHandbookPageDetail = z.infer<typeof publicHandbookPageDetailSchema>;

export const handbookSearchQuerySchema = z.object({
  q: z.string().trim().min(L.queryMin).max(L.queryMax),
});
export type HandbookSearchQuery = z.infer<typeof handbookSearchQuerySchema>;

export const handbookSearchResultSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      key: handbookPageKeySchema,
      number: z.number().int().positive(),
      chapterId: z.string(),
      title: z.string(),
      snippet: z.string(),
      /** `[start, length]` ranges of the snippet that match the query. */
      highlights: z.array(z.tuple([z.number().int().min(0), z.number().int().positive()])),
    }),
  ),
});
export type HandbookSearchResult = z.infer<typeof handbookSearchResultSchema>;

/** Text of every published page, paged: what LaviAgent indexes later (RAG). */
export const handbookPublishedTextQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type HandbookPublishedTextQuery = z.infer<typeof handbookPublishedTextQuerySchema>;

export const handbookPublishedTextSchema = z.object({
  versionNumber: z.number().int().positive(),
  accessLevel: handbookAccessLevelSchema,
  items: z.array(
    z.object({
      key: handbookPageKeySchema,
      number: z.number().int().positive(),
      chapterTitle: z.string(),
      title: z.string(),
      text: z.string(),
    }),
  ),
  nextCursor: z.number().int().nullable(),
});
export type HandbookPublishedText = z.infer<typeof handbookPublishedTextSchema>;
