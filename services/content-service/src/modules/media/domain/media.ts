import { DomainError } from "@lavieco/shared";
import {
  MEDIA_LIMITS,
  type MediaAttachmentRef,
  type MediaFormat,
  type MediaPurpose,
} from "@lavieco/shared/media";

export type MediaStatus = "pending" | "attached" | "deleted";

/** Who uploaded: staff for event images, the member themself for an avatar. */
export type MediaActor = { kind: "staff" | "member"; userId: string };

export type MediaAttachment = MediaAttachmentRef & { service: "program-service" };

/** One `media` document as the application sees it (docs/03 §5.8). */
export type MediaRecord = {
  id: string;
  purpose: MediaPurpose;
  status: MediaStatus;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: MediaFormat;
  sha256: string;
  owner: { kind: "member"; userId: string } | null;
  attachedTo: MediaAttachment | null;
  uploadedBy: MediaActor;
  deletedAt: Date | null;
  storageDeletedAt: Date | null;
  /** UC-29: the record itself goes once the stored file is gone. */
  eraseAfterDestroy: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Size limit by purpose: avatar 2 MB, event images 8 MB (ADR-0020). */
export function assertUploadSize(purpose: MediaPurpose, bytes: number) {
  if (bytes > MEDIA_LIMITS.maxBytes[purpose]) throw new DomainError("media.too_large", purpose);
}

export function assertPixelCount(width: number, height: number) {
  if (width * height > MEDIA_LIMITS.maxPixels) throw new DomainError("media.too_many_pixels");
}

/** `lavieco/<env>/<events|avatars>/<media id>`: stable, never reused, no personal data. */
export function publicIdFor(root: string, purpose: MediaPurpose, id: string) {
  return `${root}/${purpose === "avatar" ? "avatars" : "events"}/${id}`;
}

const sameRef = (a: MediaAttachmentRef | null, b: MediaAttachmentRef) =>
  a !== null && a.kind === b.kind && a.id === b.id;

const isEventImage = (purpose: MediaPurpose) =>
  purpose === "event_cover" || purpose === "event_gallery";

/**
 * Attaching is idempotent for the same holder; an image that is gone, an avatar,
 * or one already used elsewhere cannot be attached (one image, one event).
 */
export function attachDecision(
  record: MediaRecord | null,
  ref: MediaAttachmentRef,
): "attach" | "already_attached" {
  if (!record || !isEventImage(record.purpose)) throw new DomainError("media.unavailable");
  if (record.status === "pending") return "attach";
  if (record.status === "attached" && sameRef(record.attachedTo, ref)) return "already_attached";
  throw new DomainError("media.unavailable");
}

/**
 * Releasing is idempotent (outbox retries); only the current holder may release an
 * attached image. A pending one was never used, so anyone holding its id may drop it.
 */
export function releaseDecision(
  record: MediaRecord | null,
  ref: MediaAttachmentRef,
): "release" | "nothing_to_do" {
  if (!record || record.status === "deleted") return "nothing_to_do";
  if (!isEventImage(record.purpose)) throw new DomainError("media.unavailable");
  if (record.status === "pending" || sameRef(record.attachedTo, ref)) return "release";
  throw new DomainError("media.unavailable");
}

/** A pending upload older than the TTL is abandoned (the editor never saved). */
export function pendingCutoff(now: Date): Date {
  return new Date(now.getTime() - MEDIA_LIMITS.pendingTtlHours * 60 * 60 * 1000);
}
