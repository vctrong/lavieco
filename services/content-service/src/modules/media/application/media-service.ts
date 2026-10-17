import { createHash } from "node:crypto";

import type { OutboxPort, TxContext, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type {
  EventImagePurpose,
  MediaAttachRequest,
  MediaAttachmentRef,
  MediaPurpose,
} from "@lavieco/shared/media";

import { sniffImageFormat } from "../domain/image-format";
import {
  assertPixelCount,
  assertUploadSize,
  attachDecision,
  pendingCutoff,
  publicIdFor,
  releaseDecision,
  type MediaActor,
  type MediaRecord,
} from "../domain/media";
import type { ImageProcessor } from "./ports/image-processor.port";
import type { MarkDeletedOptions, MediaRepository } from "./ports/media-repository.port";
import { MediaStorageError, type MediaStorage } from "./ports/media-storage.port";

/** Outbox job: delete the stored file of a released media (payload `{ mediaId }`). */
export const MEDIA_DESTROY_JOB = "media.destroy";

const SWEEP_BATCH = 100;

/**
 * Uploads, attachment and release of images (ADR-0020). Every file is checked by its
 * real content and cleaned of metadata BEFORE it leaves this service; releasing an
 * image marks it deleted and queues the file removal in the same transaction.
 */
export class MediaService {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: MediaStorage,
    private readonly images: ImageProcessor,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly rootFolder: string,
  ) {}

  /** Admin: cover or gallery image of an event. Stays `pending` until program-service attaches it. */
  async uploadEventImage(purpose: EventImagePurpose, bytes: Uint8Array, actor: MediaActor) {
    const prepared = await this.prepare(purpose, bytes);
    await this.store(prepared);
    try {
      return await this.media.insert({
        ...prepared.record,
        status: "pending",
        owner: null,
        uploadedBy: actor,
      });
    } catch (error) {
      await this.forget(prepared.record.publicId);
      throw error;
    }
  }

  /** Called by program-service before it saves an event (the snapshot comes from here). */
  async attach(id: string, request: MediaAttachRequest): Promise<MediaRecord> {
    const record = await this.media.findById(id);
    if (attachDecision(record, request.ref) === "already_attached") return record!;
    const attached = await this.media.markAttached(
      id,
      { service: "program-service", ...request.ref },
      request.purpose,
    );
    if (attached) return attached;
    // Lost a race (swept, or attached elsewhere meanwhile): decide again on fresh data.
    const fresh = await this.media.findById(id);
    if (attachDecision(fresh, request.ref) === "already_attached") return fresh!;
    throw new DomainError("media.unavailable");
  }

  /** Outbox `media.release` of program-service: the image left its event. */
  async release(id: string, ref: MediaAttachmentRef, now = new Date()) {
    await this.unitOfWork.run(async (tx) => {
      const record = await this.media.findById(id, tx);
      if (releaseDecision(record, ref) === "nothing_to_do") return;
      await this.discard(id, now, tx);
    });
  }

  async getAvatar(userId: string) {
    return this.media.findActiveAvatar(userId);
  }

  /** Member: new avatar replaces the old one, whose file is then deleted. */
  async replaceAvatar(userId: string, bytes: Uint8Array, now = new Date()) {
    const prepared = await this.prepare("avatar", bytes);
    await this.store(prepared);
    try {
      return await this.unitOfWork.run(async (tx) => {
        const current = await this.media.findActiveAvatar(userId, tx);
        if (current) await this.discard(current.id, now, tx);
        return this.media.insert(
          {
            ...prepared.record,
            status: "attached",
            owner: { kind: "member", userId },
            uploadedBy: { kind: "member", userId },
          },
          tx,
        );
      });
    } catch (error) {
      await this.forget(prepared.record.publicId);
      throw error;
    }
  }

  async removeAvatar(userId: string, now = new Date()) {
    await this.unitOfWork.run(async (tx) => {
      const current = await this.media.findActiveAvatar(userId, tx);
      if (current) await this.discard(current.id, now, tx);
    });
  }

  /**
   * UC-29 (account deletion): every avatar of the member goes, files first, then the
   * records. TODO(UC-29): called by identity-service once its deletion flow exists.
   */
  async eraseMemberMedia(userId: string, now = new Date()) {
    return this.unitOfWork.run(async (tx) => {
      const avatars = await this.media.listAvatars(userId, tx);
      for (const avatar of avatars) {
        await this.discard(avatar.id, now, tx, { eraseAfterDestroy: true });
        if (avatar.status === "deleted") {
          // Already released earlier: the record may still need erasing.
          await this.outbox.enqueue(tx, {
            type: MEDIA_DESTROY_JOB,
            payload: { mediaId: avatar.id },
          });
        }
      }
      return avatars.length;
    });
  }

  /** Abandoned uploads (never attached within the TTL) are released. */
  async sweepPending(now = new Date()) {
    const stale = await this.media.listPendingBefore(pendingCutoff(now), SWEEP_BATCH);
    for (const record of stale) {
      // Only if still pending: an attach may have won the race since the listing.
      await this.unitOfWork.run((tx) => this.discard(record.id, now, tx, { onlyIfPending: true }));
    }
    return stale.length;
  }

  /** Outbox handler of `media.destroy`: deletes the stored file, then erases if asked. */
  async destroyStored(id: string, now = new Date()) {
    const record = await this.media.findById(id);
    if (!record || record.status !== "deleted") return;
    if (record.storageDeletedAt === null) {
      await this.storage.destroy(record.publicId);
      await this.media.markStorageDeleted(id, now);
    }
    if (record.eraseAfterDestroy) await this.media.erase(id);
  }

  private async discard(id: string, now: Date, tx: TxContext, options: MarkDeletedOptions = {}) {
    const changed = await this.media.markDeleted(id, now, options, tx);
    if (changed) {
      await this.outbox.enqueue(tx, { type: MEDIA_DESTROY_JOB, payload: { mediaId: id } });
    }
  }

  /** Size → real type → decode, rotate, strip metadata (ADR-0020). Nothing is stored yet. */
  private async prepare(purpose: MediaPurpose, bytes: Uint8Array) {
    assertUploadSize(purpose, bytes.byteLength);
    const sniffed = sniffImageFormat(bytes);
    if (sniffed === null) throw new DomainError("media.type_unsupported");
    if (sniffed.kind === "refused") {
      // `detail` names the format ("heic", "heif", "avif") so the UI can say which one.
      throw new DomainError("media.format_refused", sniffed.format);
    }
    const clean = await this.images.clean(bytes, sniffed.format);
    assertPixelCount(clean.width, clean.height);
    const id = this.media.newId();
    return {
      bytes: clean.bytes,
      record: {
        id,
        purpose,
        publicId: publicIdFor(this.rootFolder, purpose, id),
        width: clean.width,
        height: clean.height,
        bytes: clean.bytes.byteLength,
        format: clean.format,
        sha256: createHash("sha256").update(clean.bytes).digest("hex"),
      },
    };
  }

  private async store(prepared: Awaited<ReturnType<MediaService["prepare"]>>) {
    try {
      await this.storage.upload({ publicId: prepared.record.publicId, bytes: prepared.bytes });
    } catch (error) {
      if (error instanceof MediaStorageError) throw new DomainError("common.unavailable");
      throw error;
    }
  }

  /** Best effort when the record could not be written: the file must not linger. */
  private async forget(publicId: string) {
    await this.storage.destroy(publicId).catch(() => undefined);
  }
}
