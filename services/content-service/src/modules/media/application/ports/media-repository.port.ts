import type { TxContext } from "@lavieco/service-kit/ports";
import type { MediaFormat, MediaPurpose } from "@lavieco/shared/media";

import type { MediaActor, MediaAttachment, MediaRecord } from "../../domain/media";

export const MEDIA_REPOSITORY = Symbol("MEDIA_REPOSITORY");

export type NewMedia = {
  id: string;
  purpose: MediaPurpose;
  status: "pending" | "attached";
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: MediaFormat;
  sha256: string;
  owner: { kind: "member"; userId: string } | null;
  uploadedBy: MediaActor;
};

export type MarkDeletedOptions = { eraseAfterDestroy?: boolean; onlyIfPending?: boolean };

export interface MediaRepository {
  /** A fresh id, known before upload so the stored file can be named after it. */
  newId(): string;
  insert(media: NewMedia, tx?: TxContext): Promise<MediaRecord>;
  findById(id: string, tx?: TxContext): Promise<MediaRecord | null>;
  /** pending → attached; null when the record is no longer pending (lost a race). */
  markAttached(
    id: string,
    attachment: MediaAttachment,
    purpose: MediaPurpose,
  ): Promise<MediaRecord | null>;
  /**
   * Sets `deleted`; returns false when it already was (or, with `onlyIfPending`, when
   * it is no longer pending). `eraseAfterDestroy` is recorded even on a deleted record.
   */
  markDeleted(id: string, at: Date, options: MarkDeletedOptions, tx: TxContext): Promise<boolean>;
  markStorageDeleted(id: string, at: Date): Promise<void>;
  erase(id: string): Promise<void>;
  findActiveAvatar(userId: string, tx?: TxContext): Promise<MediaRecord | null>;
  /** Every avatar record of a member, whatever its status (UC-29). */
  listAvatars(userId: string, tx?: TxContext): Promise<MediaRecord[]>;
  /** Pending uploads created before `cutoff`, oldest first. */
  listPendingBefore(cutoff: Date, limit: number): Promise<MediaRecord[]>;
}
