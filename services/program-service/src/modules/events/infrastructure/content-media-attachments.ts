import {
  ServiceProblemError,
  ServiceUnavailableError,
  createContentClient,
  createServiceTokenSigner,
} from "@lavieco/api-clients";
import { DomainError } from "@lavieco/shared";
import type { EventImagePurpose } from "@lavieco/shared/media";

import type { MediaAttachments } from "../application/ports/media-attachments.port";

/**
 * `MediaAttachments` over content-service's internal API, with program-service's own
 * service token (`aud: content-service`, ADR-0018).
 */
export function createContentMediaAttachments(options: {
  contentServiceUrl: string;
  privateJwk: string;
  fetchImpl?: typeof fetch;
}): MediaAttachments {
  const client = createContentClient({
    baseUrl: options.contentServiceUrl,
    signer: createServiceTokenSigner({ issuer: "program-service", privateJwk: options.privateJwk }),
    fetchImpl: options.fetchImpl,
  });

  return {
    async attach(mediaId: string, purpose: EventImagePurpose, eventId: string) {
      try {
        const media = await client.attachMedia(mediaId, {
          purpose,
          ref: { kind: "event", id: eventId },
        });
        return { publicId: media.publicId, width: media.width, height: media.height };
      } catch (error) {
        throw toDomainError(error);
      }
    },
    async release(mediaId: string, eventId: string) {
      await client.releaseMedia(mediaId, { kind: "event", id: eventId });
    },
  };
}

/** The editor gets "image unavailable, upload again" or "try later", never a raw 500. */
function toDomainError(error: unknown): unknown {
  if (error instanceof ServiceProblemError && error.problem.code === "media.unavailable") {
    return new DomainError("media.unavailable");
  }
  if (error instanceof ServiceProblemError || error instanceof ServiceUnavailableError) {
    return new DomainError("common.unavailable");
  }
  return error;
}
