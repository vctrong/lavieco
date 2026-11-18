import type {
  HandbookImportJob,
  HandbookOverview,
  HandbookUpload,
  HandbookVersion,
  HandbookVersionSummary,
} from "@lavieco/shared/content";

import type { ImportJobRecord, UploadRecord } from "../application/ports/import-ports";
import {
  aspectIsOff,
  textIsMissing,
  type HandbookRecord,
  type VersionRecord,
} from "../domain/handbook";

const iso = (date: Date | null) => (date ? date.toISOString() : null);

export function toVersionDto(version: VersionRecord): HandbookVersion {
  return {
    id: version.id,
    number: version.number,
    status: version.status,
    title: version.title,
    description: version.description,
    note: version.note,
    basedOnNumber: version.basedOnNumber,
    revision: version.revision,
    chapters: version.chapters,
    pages: version.pages.map((page) => ({
      ...page,
      missingText: textIsMissing(page.text),
      aspectOff: aspectIsOff(page.image.width, page.image.height),
    })),
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
    publishedBy: version.publishedBy,
    publishedAt: iso(version.publishedAt),
  };
}

export function toSummaryDto(version: VersionRecord, restorable: boolean): HandbookVersionSummary {
  return {
    id: version.id,
    number: version.number,
    status: version.status,
    note: version.note,
    pageCount: version.pages.length,
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
    publishedBy: version.publishedBy,
    publishedAt: iso(version.publishedAt),
    restorable,
  };
}

export function toOverviewDto(overview: {
  handbook: HandbookRecord;
  draft: VersionRecord | null;
  published: VersionRecord | null;
  versions: { version: VersionRecord; restorable: boolean }[];
}): HandbookOverview {
  return {
    id: overview.handbook.id,
    slug: overview.handbook.slug,
    accessLevel: overview.handbook.accessLevel,
    publishedNumber: overview.published?.number ?? null,
    draft: overview.draft ? toVersionDto(overview.draft) : null,
    published: overview.published ? toVersionDto(overview.published) : null,
    versions: overview.versions.map(({ version, restorable }) => toSummaryDto(version, restorable)),
  };
}

export function toUploadDto(upload: UploadRecord): HandbookUpload {
  return {
    id: upload.id,
    kind: upload.kind,
    size: upload.size,
    chunkBytes: upload.chunkBytes,
    chunks: upload.chunks,
    receivedChunks: upload.receivedChunks,
    complete: upload.receivedChunks === upload.chunks,
  };
}

export function toJobDto({
  job,
  queuePosition,
}: {
  job: ImportJobRecord;
  queuePosition: number | null;
}): HandbookImportJob {
  return {
    id: job.id,
    status: job.status,
    mode: job.mode,
    queuePosition,
    total: job.total,
    done: job.done,
    warnings: job.warnings,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    finishedAt: iso(job.finishedAt),
  };
}
