import type { OutboxPort, TxContext } from "@lavieco/service-kit/ports";

import {
  buildImages,
  imagesToAttach,
  type EventImages,
  type EventImagesInput,
  type ImageFile,
} from "../domain/event-images";
import type { MediaAttachments } from "./ports/media-attachments.port";

/** Outbox job: give an image back to content-service (payload `{ mediaId, eventId }`). */
export const RELEASE_MEDIA_JOB = "media.release";

/**
 * Attaches the images this event does not hold yet, BEFORE the transaction that saves
 * it (no external call inside a transaction, S5), and returns the snapshots to store.
 * If the save then fails, an attached image stays unused: accepted in ADR-0020.
 */
export async function resolveEventImages(
  media: MediaAttachments,
  eventId: string,
  current: EventImages,
  input: EventImagesInput,
): Promise<EventImages> {
  const attached = new Map<string, ImageFile>();
  for (const { mediaId, purpose } of imagesToAttach(current, input)) {
    attached.set(mediaId, await media.attach(mediaId, purpose, eventId));
  }
  return buildImages(current, input, attached);
}

/** Same transaction as the event change: the images will be released (and deleted). */
export async function queueImageRelease(
  outbox: OutboxPort,
  tx: TxContext,
  eventId: string,
  mediaIds: readonly string[],
) {
  for (const mediaId of mediaIds) {
    await outbox.enqueue(tx, { type: RELEASE_MEDIA_JOB, payload: { mediaId, eventId } });
  }
}
