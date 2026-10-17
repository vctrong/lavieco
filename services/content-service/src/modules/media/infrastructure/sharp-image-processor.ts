import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import { DomainError } from "@lavieco/shared";
import { MEDIA_LIMITS, type MediaFormat } from "@lavieco/shared/media";

import type { CleanImage, ImageProcessor } from "../application/ports/image-processor.port";

/**
 * sharp writes no metadata unless asked (`withMetadata`/`keepExif` are never used
 * here), so re-encoding drops EXIF, GPS and XMP. `rotate()` first bakes the EXIF
 * orientation into the pixels, since the tag itself disappears (ADR-0020).
 */
@Injectable()
export class SharpImageProcessor implements ImageProcessor {
  async clean(bytes: Uint8Array, format: MediaFormat): Promise<CleanImage> {
    const input = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const options = { limitInputPixels: MEDIA_LIMITS.maxPixels, failOn: "error" } as const;
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(input, options).metadata();
    } catch {
      throw new DomainError("media.image_invalid");
    }
    if (metadata.width * metadata.height > MEDIA_LIMITS.maxPixels) {
      throw new DomainError("media.too_many_pixels");
    }
    // The decoder must agree with the magic bytes, or the file is not what it claims.
    if (metadata.format !== format) throw new DomainError("media.image_invalid");

    const pipeline = sharp(input, options).rotate();
    const encoded =
      format === "jpeg"
        ? pipeline.jpeg({ quality: 90, mozjpeg: true })
        : format === "png"
          ? pipeline.png({ compressionLevel: 9 })
          : pipeline.webp({ quality: 90 });
    try {
      const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
      return { bytes: new Uint8Array(data), width: info.width, height: info.height, format };
    } catch {
      throw new DomainError("media.image_invalid");
    }
  }
}
