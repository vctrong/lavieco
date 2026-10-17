import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { DomainError } from "@lavieco/shared";

import { SharpImageProcessor } from "./sharp-image-processor";

const grey = { r: 120, g: 130, b: 140 };

/** A 40×20 JPEG carrying EXIF (camera, GPS) and an orientation tag of 6 (rotate 90°). */
async function photoWithExif() {
  return sharp({ create: { width: 40, height: 20, channels: 3, background: grey } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .withExifMerge({
      IFD0: { Make: "TestCam", Model: "T1" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "10/1 2/1 0/1" },
    })
    .toBuffer();
}

describe("SharpImageProcessor (ADR-0020: strip metadata before upload)", () => {
  const processor = new SharpImageProcessor();

  it("drops EXIF/GPS and bakes the orientation into the pixels", async () => {
    const input = await photoWithExif();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const clean = await processor.clean(new Uint8Array(input), "jpeg");
    const metadata = await sharp(Buffer.from(clean.bytes)).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(Buffer.from(clean.bytes).includes(Buffer.from("TestCam"))).toBe(false);
    // Orientation 6 = rotated a quarter turn: 40×20 becomes 20×40.
    expect({ width: clean.width, height: clean.height, format: clean.format }).toEqual({
      width: 20,
      height: 40,
      format: "jpeg",
    });
  });

  it("keeps PNG and WebP in their format", async () => {
    for (const format of ["png", "webp"] as const) {
      const input = await sharp({
        create: { width: 8, height: 8, channels: 3, background: grey },
      })
        .toFormat(format)
        .toBuffer();
      const clean = await processor.clean(new Uint8Array(input), format);
      expect((await sharp(Buffer.from(clean.bytes)).metadata()).format).toBe(format);
    }
  });

  it("refuses bytes that do not decode as the sniffed format", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: grey } })
      .png()
      .toBuffer();
    const truncatedJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3]);
    for (const [bytes, format] of [
      [new Uint8Array(png), "jpeg"],
      [truncatedJpeg, "jpeg"],
    ] as const) {
      await expect(processor.clean(bytes, format)).rejects.toSatisfy(
        (error: unknown) => error instanceof DomainError && error.code === "media.image_invalid",
      );
    }
  });
});
