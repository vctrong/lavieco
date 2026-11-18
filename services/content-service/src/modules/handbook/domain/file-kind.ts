import type { HandbookUploadKind } from "@lavieco/shared/content";

/**
 * First bytes of an upload, checked on its first chunk: the declared kind must match
 * the real content (CLAUDE §11). Images are checked again in full by `media`.
 */
export function matchesKind(kind: HandbookUploadKind, head: Uint8Array): boolean {
  if (kind === "pdf") {
    // "%PDF-"
    return (
      head[0] === 0x25 &&
      head[1] === 0x50 &&
      head[2] === 0x44 &&
      head[3] === 0x46 &&
      head[4] === 0x2d
    );
  }
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const webp =
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50;
  return jpeg || png || webp;
}

/** Bytes expected for chunk `index` of a file of `size` cut in `chunkBytes` pieces. */
export function chunkLength(size: number, chunkBytes: number, index: number): number {
  return Math.min(chunkBytes, size - index * chunkBytes);
}
