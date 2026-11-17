import {
  ServiceProblemError,
  ServiceUnavailableError,
  createContentClient,
  createServiceTokenSigner,
} from "@lavieco/api-clients";
import { DomainError } from "@lavieco/shared";

import type { ProductMedia } from "../application/ports";

/** `ProductMedia` over content-service's internal API with program-service's token (ADR-0018). */
export function createContentProductMedia(options: {
  contentServiceUrl: string;
  privateJwk: string;
  fetchImpl?: typeof fetch;
}): ProductMedia {
  const client = createContentClient({
    baseUrl: options.contentServiceUrl,
    signer: createServiceTokenSigner({ issuer: "program-service", privateJwk: options.privateJwk }),
    fetchImpl: options.fetchImpl,
  });
  return {
    async attach(mediaId, productId) {
      try {
        const media = await client.attachMedia(mediaId, {
          purpose: "product_image",
          ref: { kind: "product", id: productId },
        });
        return { publicId: media.publicId, width: media.width, height: media.height };
      } catch (error) {
        if (error instanceof ServiceProblemError && error.problem.code === "media.unavailable") {
          throw new DomainError("media.unavailable");
        }
        if (error instanceof ServiceProblemError || error instanceof ServiceUnavailableError) {
          throw new DomainError("common.unavailable");
        }
        throw error;
      }
    },
    async release(mediaId, productId) {
      await client.releaseMedia(mediaId, { kind: "product", id: productId });
    },
  };
}
