import { createHash, randomBytes } from "node:crypto";

import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import {
  HANDBOOK_DEFAULT_SLUG,
  type HandbookActor,
  type HandbookPageUpdate,
  type HandbookPublishRequest,
  type HandbookRestoreRequest,
  type HandbookStructureUpdate,
} from "@lavieco/shared/content";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditTrail, ContentAuditAction } from "../../audit";
import {
  applyPageUpdate,
  applyStructure,
  assertPublishable,
  copyContent,
  emptyContent,
  keptVersionIds,
  mediaIdsInUse,
  publishWarnings,
  type HandbookRecord,
  type VersionContent,
  type VersionRecord,
} from "../domain/handbook";
import type { HandbookRepository } from "./ports/handbook-repository.port";
import type { HandbookPageMedia } from "./ports/page-media.port";
import type { HandbookPreviewTokenRepository } from "./ports/preview-token-repository.port";

/**
 * Outbox job after a publish or restore (payload `{ versionId, restoredFrom }`): team
 * alert by Web Push and revalidation of the web cache.
 */
export const HANDBOOK_PUBLISHED_JOB = "handbook.published";

export type EditorActor = {
  userId: string;
  name: string;
  roles: readonly Role[];
  requestId: string | null;
};

const PREVIEW_TTL_MS = 10 * 60 * 1000;
/** Images younger than this are never cleaned: an import may still be writing them. */
const CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;

export const hashPreviewToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");

const actorRef = (actor: EditorActor): HandbookActor => ({
  userId: actor.userId,
  name: actor.name,
});

/**
 * "Cẩm nang" in the back office (UC-22, ADR-0029). One draft at a time; publishing is
 * done by anyone with `handbook:publish` (no second reviewer, BR-26), always with a
 * release note, audited, and announced to the team by Web Push.
 */
export class HandbookEditor {
  constructor(
    private readonly handbooks: HandbookRepository,
    private readonly previewTokens: HandbookPreviewTokenRepository,
    private readonly media: HandbookPageMedia,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditTrail,
  ) {}

  /** The back-office screen: draft and published versions in full, history in summary. */
  async overview() {
    const handbook = await this.handbooks.ensure(HANDBOOK_DEFAULT_SLUG);
    const [draft, published, versions] = await Promise.all([
      handbook.draftVersionId ? this.handbooks.findVersion(handbook.draftVersionId) : null,
      handbook.publishedVersionId ? this.handbooks.findVersion(handbook.publishedVersionId) : null,
      this.handbooks.listVersions(handbook.id),
    ]);
    const kept = keptVersionIds(versions);
    return {
      handbook,
      draft,
      published,
      versions: versions.map((version) => ({
        version,
        restorable: version.publishedAt !== null && kept.has(version.id),
      })),
    };
  }

  /** "Bắt đầu chỉnh sửa": a draft copied from the published version (or an empty book). */
  async startDraft(actor: EditorActor) {
    return this.unitOfWork.run(async (tx) => {
      const handbook = await this.requireHandbook(tx);
      if (handbook.draftVersionId) throw new DomainError("handbook.draft_exists");
      const published = handbook.publishedVersionId
        ? await this.handbooks.findVersion(handbook.publishedVersionId, tx)
        : null;
      const number = handbook.lastNumber + 1;
      const draft = await this.handbooks.insertVersion(
        {
          ...(published ? copyContent(published) : emptyContent()),
          handbookId: handbook.id,
          number,
          status: "draft",
          note: "",
          basedOnNumber: published?.number ?? null,
          createdBy: actorRef(actor),
          publishedBy: null,
          publishedAt: null,
        },
        tx,
      );
      await this.movePointers(
        handbook,
        { ...this.pointersOf(handbook), draftVersionId: draft.id, lastNumber: number },
        tx,
      );
      return draft;
    });
  }

  async updateStructure(input: HandbookStructureUpdate) {
    const draft = await this.requireDraft();
    return this.saveDraft(draft, input.revision, applyStructure(draft, input));
  }

  async updatePage(pageId: string, input: HandbookPageUpdate) {
    const draft = await this.requireDraft();
    return this.saveDraft(draft, input.revision, applyPageUpdate(draft, pageId, input));
  }

  /** "Bỏ bản nháp": the draft is archived (kept in history as discarded), audited. */
  async discardDraft(revision: number, actor: EditorActor, now = new Date()) {
    await this.unitOfWork.run(async (tx) => {
      const handbook = await this.requireHandbook(tx);
      const draft = await this.draftOf(handbook, tx);
      if (draft.revision !== revision) throw new DomainError("common.conflict");
      await this.handbooks.markArchived(draft.id, tx);
      await this.movePointers(handbook, { ...this.pointersOf(handbook), draftVersionId: null }, tx);
      await this.record(tx, "handbook.draft_discard", draft, actor, now, {
        number: draft.number,
      });
    });
  }

  /** Publishes the draft (D1): note required, audit, team alert, old version archived. */
  async publish(input: HandbookPublishRequest, actor: EditorActor, now = new Date()) {
    const result = await this.unitOfWork.run(async (tx) => {
      const handbook = await this.requireHandbook(tx);
      const draft = await this.draftOf(handbook, tx);
      if (draft.revision !== input.revision) throw new DomainError("common.conflict");
      assertPublishable(draft);
      const published = await this.handbooks.markPublished(
        draft.id,
        input.revision,
        { note: input.note, publishedBy: actorRef(actor), publishedAt: now },
        tx,
      );
      if (!published) throw new DomainError("common.conflict");
      if (handbook.publishedVersionId) {
        await this.handbooks.markArchived(handbook.publishedVersionId, tx);
      }
      await this.movePointers(
        handbook,
        { ...this.pointersOf(handbook), publishedVersionId: draft.id, draftVersionId: null },
        tx,
      );
      await this.announce(tx, published, null);
      await this.record(tx, "handbook.publish", published, actor, now, {
        number: published.number,
        pages: published.pages.length,
      });
      return published;
    });
    return { version: result, warnings: publishWarnings(result) };
  }

  /**
   * Restores an old version: a copy of it is published as a new version number (D1), so
   * history only ever grows. A draft in progress must be discarded explicitly.
   */
  async restore(input: HandbookRestoreRequest, actor: EditorActor, now = new Date()) {
    const versions = await this.handbooks.listVersions((await this.requireHandbook()).id);
    const kept = keptVersionIds(versions);
    const result = await this.unitOfWork.run(async (tx) => {
      const handbook = await this.requireHandbook(tx);
      const source = await this.handbooks.findVersionByNumber(handbook.id, input.number, tx);
      if (!source || source.publishedAt === null) throw new DomainError("handbook.version_unknown");
      if (!kept.has(source.id)) throw new DomainError("handbook.version_not_restorable");
      if (handbook.draftVersionId) {
        if (!input.discardDraft) throw new DomainError("handbook.draft_exists");
        await this.handbooks.markArchived(handbook.draftVersionId, tx);
      }
      const number = handbook.lastNumber + 1;
      const restored = await this.handbooks.insertVersion(
        {
          ...copyContent(source),
          handbookId: handbook.id,
          number,
          status: "published",
          note: input.note,
          basedOnNumber: source.number,
          createdBy: actorRef(actor),
          publishedBy: actorRef(actor),
          publishedAt: now,
        },
        tx,
      );
      if (handbook.publishedVersionId) {
        await this.handbooks.markArchived(handbook.publishedVersionId, tx);
      }
      await this.movePointers(
        handbook,
        { publishedVersionId: restored.id, draftVersionId: null, lastNumber: number },
        tx,
      );
      await this.announce(tx, restored, source.number);
      await this.record(tx, "handbook.restore", restored, actor, now, {
        number: restored.number,
        from: source.number,
      });
      return restored;
    });
    return { version: result, warnings: publishWarnings(result) };
  }

  /** 10-minute link to read the draft on `web` (noindex), like event previews (D2). */
  async createPreviewToken(actor: EditorActor, now = new Date()) {
    const draft = await this.requireDraft();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS);
    await this.previewTokens.insert({
      tokenHash: hashPreviewToken(token),
      versionId: draft.id,
      createdBy: actor.userId,
      expiresAt,
    });
    return { token, expiresAt };
  }

  /**
   * Releases page images no kept version uses (risks: Cloudinary storage). Kept: the
   * published version, the draft and the 3 latest published-then-archived ones.
   */
  async cleanupMedia(now = new Date()) {
    const handbook = await this.handbooks.findBySlug(HANDBOOK_DEFAULT_SLUG);
    if (!handbook) return 0;
    const versions = await this.handbooks.listVersions(handbook.id);
    const kept = keptVersionIds(versions);
    const keptVersions = await Promise.all(
      versions
        .filter((version) => kept.has(version.id))
        .map((version) => this.handbooks.findVersion(version.id)),
    );
    const inUse = mediaIdsInUse(keptVersions.filter((version) => version !== null));
    const candidates = await this.media.listHandbookPageIds(
      new Date(now.getTime() - CLEANUP_GRACE_MS),
    );
    return this.media.releaseHandbookPages(
      candidates.filter((id) => !inUse.has(id)),
      now,
    );
  }

  private async saveDraft(draft: VersionRecord, revision: number, content: VersionContent) {
    if (draft.revision !== revision) throw new DomainError("common.conflict");
    const saved = await this.handbooks.updateDraft(draft.id, revision, content);
    if (!saved) throw new DomainError("common.conflict");
    return saved;
  }

  private async requireHandbook(tx?: TxContext): Promise<HandbookRecord> {
    const handbook =
      (await this.handbooks.findBySlug(HANDBOOK_DEFAULT_SLUG, tx)) ??
      (tx ? null : await this.handbooks.ensure(HANDBOOK_DEFAULT_SLUG));
    if (!handbook) throw new DomainError("common.not_found");
    return handbook;
  }

  private async requireDraft() {
    const handbook = await this.requireHandbook();
    return this.draftOf(handbook);
  }

  private async draftOf(handbook: HandbookRecord, tx?: TxContext) {
    if (!handbook.draftVersionId) throw new DomainError("handbook.no_draft");
    const draft = await this.handbooks.findVersion(handbook.draftVersionId, tx);
    if (!draft || draft.status !== "draft") throw new DomainError("handbook.no_draft");
    return draft;
  }

  private pointersOf(handbook: HandbookRecord) {
    return {
      publishedVersionId: handbook.publishedVersionId,
      draftVersionId: handbook.draftVersionId,
      lastNumber: handbook.lastNumber,
    };
  }

  private async movePointers(
    handbook: HandbookRecord,
    pointers: ReturnType<HandbookEditor["pointersOf"]>,
    tx: TxContext,
  ) {
    const moved = await this.handbooks.setPointers(handbook.id, handbook.revision, pointers, tx);
    if (!moved) throw new DomainError("common.conflict");
  }

  private announce(tx: TxContext, version: VersionRecord, restoredFrom: number | null) {
    return this.outbox.enqueue(tx, {
      type: HANDBOOK_PUBLISHED_JOB,
      payload: { versionId: version.id, restoredFrom },
    });
  }

  private record(
    tx: TxContext,
    action: ContentAuditAction,
    version: VersionRecord,
    actor: EditorActor,
    now: Date,
    meta: Record<string, string | number | boolean>,
  ) {
    return this.audit.record(
      tx,
      {
        action,
        actor: { userId: actor.userId, roles: actor.roles },
        target: { type: "handbook_version", id: version.id },
        requestId: actor.requestId,
        meta,
      },
      now,
    );
  }
}
