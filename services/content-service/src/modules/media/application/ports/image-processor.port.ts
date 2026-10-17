import type { MediaFormat } from "@lavieco/shared/media";

export const IMAGE_PROCESSOR = Symbol("IMAGE_PROCESSOR");

export type CleanImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
  format: MediaFormat;
};

/**
 * Decodes an image, applies its EXIF orientation and re-encodes it WITHOUT metadata
 * (EXIF, GPS, XMP), keeping the format (ADR-0020). Throws `media.image_invalid` when the
 * bytes do not decode as `format`, `media.too_many_pixels` above the pixel limit.
 */
export interface ImageProcessor {
  clean(bytes: Uint8Array, format: MediaFormat): Promise<CleanImage>;
}
