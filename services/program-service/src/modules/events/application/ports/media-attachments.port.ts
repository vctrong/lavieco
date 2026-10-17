import type { EventImagePurpose } from "@lavieco/shared/media";

import type { ImageFile } from "../../domain/event-images";

export const MEDIA_ATTACHMENTS = Symbol("MEDIA_ATTACHMENTS");

/**
 * content-service's view of the images an event uses (ADR-0020). Implemented over
 * HTTP with program-service's service token; faked in tests.
 */
export interface MediaAttachments {
  /**
   * Claims an uploaded image for the event and returns its file. Throws
   * `media.unavailable` (gone, or another event's) or `common.unavailable`.
   */
  attach(mediaId: string, purpose: EventImagePurpose, eventId: string): Promise<ImageFile>;
  /** Gives the image back; content-service deletes the file. Idempotent. */
  release(mediaId: string, eventId: string): Promise<void>;
}
