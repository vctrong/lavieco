import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import {
  HANDBOOK_DEFAULT_SLUG,
  HANDBOOK_LIMITS,
  type HandbookImportCreate,
  type HandbookUploadCreate,
} from "@lavieco/shared/content";

import type { AuditTrail } from "../../audit";
import { chunkLength, matchesKind } from "../domain/file-kind";
import { aspectIsOff, textIsMissing, textRatio } from "../domain/handbook";
import { applyImport, type ImportedPage } from "../domain/import-plan";
import type { EditorActor } from "./handbook-editor";
import type { HandbookRepository } from "./ports/handbook-repository.port";
import {
  PdfInvalidError,
  PdfToolsMissingError,
  type ImportError,
  type ImportJobRecord,
  type ImportJobRepository,
  type ImportWarning,
  type PdfRenderer,
  type TextExtractor,
  type UploadRecord,
  type UploadRepository,
  type UploadStore,
} from "./ports/import-ports";
import type { HandbookPageMedia } from "./ports/page-media.port";

/** A job not heard from for this long is taken over (its worker crashed). */
const LEASE_MS = 5 * 60 * 1000;
/** Uploaded files are removed after this long even if never imported. */
const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const APPLY_ATTEMPTS = 3;

class ImportFailed extends Error {
  constructor(readonly reason: ImportError) {
    super(reason);
  }
}

type Source = { upload: UploadRecord; pages: number[] };

/**
 * Uploads and imports of the handbook (ADR-0029). Files arrive in chunks (the admin
 * proxy caps requests at 10 MB), then a job turns them into pages in the background,
 * one job at a time: PDF pages are rendered by poppler and their text layer read;
 * every image is cleaned, stored once (identical pages are reused) and lands in the
 * draft. Progress is polled by the editor.
 */
export class HandbookImports {
  constructor(
    private readonly handbooks: HandbookRepository,
    private readonly uploads: UploadRepository,
    private readonly jobs: ImportJobRepository,
    private readonly store: UploadStore,
    private readonly renderer: PdfRenderer,
    private readonly extractor: TextExtractor,
    private readonly media: HandbookPageMedia,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditTrail,
  ) {}

  async createUpload(input: HandbookUploadCreate, actor: Pick<EditorActor, "userId">) {
    const handbook = await this.handbooks.ensure(HANDBOOK_DEFAULT_SLUG);
    const chunkBytes = HANDBOOK_LIMITS.chunkBytes;
    return this.uploads.insert({
      id: this.uploads.newId(),
      handbookId: handbook.id,
      kind: input.kind,
      fileName: input.fileName,
      size: input.size,
      chunkBytes,
      chunks: Math.ceil(input.size / chunkBytes),
      createdBy: actor.userId,
    });
  }

  /**
   * One chunk, in order. Sending the same chunk again is harmless (a retried request);
   * skipping ahead is refused. The first chunk must really be a PDF or an image.
   */
  async receiveChunk(
    uploadId: string,
    index: number,
    bytes: Uint8Array,
    actor: Pick<EditorActor, "userId">,
  ): Promise<UploadRecord> {
    const upload = await this.uploads.find(uploadId);
    if (!upload || upload.createdBy !== actor.userId || upload.consumed) {
      throw new DomainError("handbook.upload_invalid");
    }
    if (index < upload.receivedChunks) return upload;
    if (index !== upload.receivedChunks || index >= upload.chunks) {
      throw new DomainError("handbook.upload_invalid", "order");
    }
    if (bytes.byteLength !== chunkLength(upload.size, upload.chunkBytes, index)) {
      throw new DomainError("handbook.upload_invalid", "length");
    }
    if (index === 0 && !matchesKind(upload.kind, bytes)) {
      throw new DomainError("handbook.file_type_invalid", upload.kind);
    }
    await this.store.write(upload.id, index * upload.chunkBytes, bytes);
    if (!(await this.uploads.advance(upload.id, index))) {
      throw new DomainError("common.conflict");
    }
    return { ...upload, receivedChunks: index + 1 };
  }

  /** Queues an import of complete uploads into the current draft; audited. */
  async createImport(input: HandbookImportCreate, actor: EditorActor, now = new Date()) {
    const handbook = await this.handbooks.ensure(HANDBOOK_DEFAULT_SLUG);
    if (!handbook.draftVersionId) throw new DomainError("handbook.no_draft");
    const draft = await this.handbooks.findVersion(handbook.draftVersionId);
    if (!draft || draft.status !== "draft") throw new DomainError("handbook.no_draft");
    if (input.pageId && !draft.pages.some((page) => page.id === input.pageId)) {
      throw new DomainError("handbook.page_unknown");
    }
    if (input.chapterId && !draft.chapters.some((chapter) => chapter.id === input.chapterId)) {
      throw new DomainError("handbook.structure_invalid");
    }
    const uploads = await Promise.all(input.uploadIds.map((id) => this.uploads.find(id)));
    for (const upload of uploads) {
      if (
        !upload ||
        upload.createdBy !== actor.userId ||
        upload.consumed ||
        upload.receivedChunks !== upload.chunks ||
        (await this.store.size(upload.id)) !== upload.size
      ) {
        throw new DomainError("handbook.upload_invalid");
      }
    }
    if (new Set(input.uploadIds).size !== input.uploadIds.length) {
      throw new DomainError("handbook.upload_invalid");
    }
    const job = await this.unitOfWork.run(async (tx) => {
      if (!(await this.uploads.markConsumed(input.uploadIds, tx))) {
        throw new DomainError("handbook.upload_invalid");
      }
      const created = await this.jobs.insert(
        {
          handbookId: handbook.id,
          draftVersionId: draft.id,
          uploadIds: input.uploadIds,
          mode: input.mode,
          pageId: input.pageId ?? null,
          chapterId: input.chapterId ?? null,
          createdBy: actor.userId,
        },
        tx,
      );
      await this.audit.record(
        tx,
        {
          action: "handbook.import",
          actor: { userId: actor.userId, roles: actor.roles },
          target: { type: "handbook_version", id: draft.id },
          requestId: actor.requestId,
          meta: { mode: input.mode, files: input.uploadIds.length },
        },
        now,
      );
      return created;
    });
    return this.withPosition(job);
  }

  async getJob(id: string) {
    const job = await this.jobs.find(id);
    if (!job) throw new DomainError("common.not_found");
    return this.withPosition(job);
  }

  async listJobs() {
    const handbook = await this.handbooks.ensure(HANDBOOK_DEFAULT_SLUG);
    const jobs = await this.jobs.listRecent(handbook.id, 10);
    return Promise.all(jobs.map((job) => this.withPosition(job)));
  }

  /** Worker step: runs the next job, if any. Returns false when the queue is empty. */
  async runNext(now = new Date()): Promise<boolean> {
    const job = await this.jobs.claimNext(now, new Date(now.getTime() + LEASE_MS));
    if (!job) return false;
    try {
      const warnings = await this.process(job);
      await this.jobs.finish(job.id, { status: "done", warnings, error: null }, new Date());
    } catch (error) {
      const reason: ImportError =
        error instanceof ImportFailed
          ? error.reason
          : error instanceof PdfInvalidError
            ? error.reason
            : error instanceof PdfToolsMissingError
              ? "pdf_tools_missing"
              : error instanceof DomainError && error.code.startsWith("media.")
                ? "file_invalid"
                : "internal";
      await this.jobs.finish(job.id, { status: "failed", warnings: [], error: reason }, new Date());
      if (reason === "internal") throw error;
    } finally {
      await Promise.all(job.uploadIds.map((id) => this.store.remove(id).catch(() => undefined)));
    }
    return true;
  }

  /** Files of uploads never imported are removed after 24 hours. */
  sweepUploads(now = new Date()) {
    return this.store.sweep(new Date(now.getTime() - UPLOAD_TTL_MS));
  }

  private async process(job: ImportJobRecord): Promise<ImportWarning[]> {
    const sources: Source[] = [];
    for (const id of job.uploadIds) {
      const upload = await this.uploads.find(id);
      if (!upload) throw new ImportFailed("file_invalid");
      if (upload.kind === "pdf") {
        const { pages } = await this.renderer.inspect(this.store.pathOf(upload.id));
        // Replacing one page takes the first page of the file.
        const count = job.mode === "replace_page" ? 1 : pages;
        sources.push({ upload, pages: Array.from({ length: count }, (_, i) => i + 1) });
      } else {
        sources.push({ upload, pages: [1] });
      }
    }
    const total = sources.reduce((sum, source) => sum + source.pages.length, 0);
    if (total === 0) throw new ImportFailed("file_invalid");
    if (total > HANDBOOK_LIMITS.pagesMax) throw new ImportFailed("too_many_pages");
    await this.jobs.progress(job.id, { total, done: 0, leaseUntil: this.lease() });

    const imported: ImportedPage[] = [];
    const warnings: ImportWarning[] = [];
    for (const source of sources) {
      const path = this.store.pathOf(source.upload.id);
      for (const page of source.pages) {
        const pdf = source.upload.kind === "pdf";
        const bytes = pdf
          ? await this.renderer.renderPage(path, page)
          : await this.store.read(source.upload.id);
        const text = pdf
          ? await this.extractor.fromPdfPage(path, page)
          : await this.extractor.fromImage(bytes);
        const { record } = await this.media.storeHandbookPage(bytes, job.handbookId, {
          kind: "staff",
          userId: job.createdBy,
        });
        const number = imported.length + 1;
        if (aspectIsOff(record.width, record.height))
          warnings.push({ code: "aspect_off", page: number });
        if (textIsMissing(text)) warnings.push({ code: "missing_text", page: number });
        imported.push({
          image: {
            mediaId: record.id,
            publicId: record.publicId,
            width: record.width,
            height: record.height,
          },
          text: text.slice(0, HANDBOOK_LIMITS.textMax),
        });
        await this.jobs.progress(job.id, { done: imported.length, leaseUntil: this.lease() });
      }
    }
    if (textRatio(imported) < HANDBOOK_LIMITS.lowTextRatio) {
      warnings.push({ code: "low_text_ratio", page: null });
    }
    await this.applyToDraft(job, imported);
    return warnings;
  }

  /** Lands the pages in the draft, on its latest revision (the editor may have saved meanwhile). */
  private async applyToDraft(job: ImportJobRecord, imported: ImportedPage[]) {
    for (let attempt = 0; attempt < APPLY_ATTEMPTS; attempt += 1) {
      const draft = await this.handbooks.findVersion(job.draftVersionId);
      if (!draft || draft.status !== "draft") throw new ImportFailed("draft_changed");
      let next;
      try {
        next = applyImport(
          draft,
          {
            mode: job.mode,
            ...(job.pageId ? { pageId: job.pageId } : {}),
            ...(job.chapterId ? { chapterId: job.chapterId } : {}),
          },
          imported,
        );
      } catch (error) {
        if (error instanceof DomainError && error.detail === "too_many_pages") {
          throw new ImportFailed("too_many_pages");
        }
        if (error instanceof DomainError) throw new ImportFailed("draft_changed");
        throw error;
      }
      if (await this.handbooks.updateDraft(draft.id, draft.revision, next)) return;
    }
    throw new ImportFailed("draft_changed");
  }

  private async withPosition(job: ImportJobRecord) {
    const queuePosition =
      job.status === "queued"
        ? (await this.jobs.countQueuedBefore(job.createdAt, job.id)) + 1
        : null;
    return { job, queuePosition };
  }

  private lease() {
    return new Date(Date.now() + LEASE_MS);
  }
}
