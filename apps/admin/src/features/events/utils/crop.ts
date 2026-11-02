/**
 * Pure geometry of the poster cropper. `offset` is the photo's top-left corner relative
 * to the frame's, in frame pixels; `zoom` 1 means the photo just covers the frame.
 */
export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };
export type CropRect = { x: number; y: number; width: number; height: number };

export const CROP_ZOOM_MAX = 4;
/** Longest side of the uploaded poster: the largest delivery width is 1920 (ADR-0020). */
export const CROP_OUTPUT_MAX = 1920;

/** `"4:5"` → 0.8 (width over height). */
export function ratioValue(ratio: string): number {
  const [width, height] = ratio.split(":").map(Number);
  return width! / height!;
}

/** Size of the photo on screen at this zoom. */
export function displayedSize(image: Size, frame: Size, zoom: number): Size {
  const cover = Math.max(frame.width / image.width, frame.height / image.height);
  return { width: image.width * cover * zoom, height: image.height * cover * zoom };
}

/** Keeps the frame fully covered by the photo, so the crop never has empty edges. */
export function clampOffset(offset: Offset, image: Size, frame: Size, zoom: number): Offset {
  const shown = displayedSize(image, frame, zoom);
  return {
    x: Math.min(0, Math.max(frame.width - shown.width, offset.x)),
    y: Math.min(0, Math.max(frame.height - shown.height, offset.y)),
  };
}

/** The offset that centres the photo in the frame. */
export function centredOffset(image: Size, frame: Size, zoom: number): Offset {
  const shown = displayedSize(image, frame, zoom);
  return { x: (frame.width - shown.width) / 2, y: (frame.height - shown.height) / 2 };
}

/** What the frame shows, in source-image pixels: the rectangle to draw on the canvas. */
export function cropRect(offset: Offset, image: Size, frame: Size, zoom: number): CropRect {
  const scale = displayedSize(image, frame, zoom).width / image.width;
  return {
    x: 0 - offset.x / scale,
    y: 0 - offset.y / scale,
    width: frame.width / scale,
    height: frame.height / scale,
  };
}

/** Output pixels: never upscaled, longest side at most `CROP_OUTPUT_MAX`. */
export function outputSize(rect: Pick<CropRect, "width" | "height">): Size {
  const scale = Math.min(1, CROP_OUTPUT_MAX / Math.max(rect.width, rect.height));
  return { width: Math.round(rect.width * scale), height: Math.round(rect.height * scale) };
}
