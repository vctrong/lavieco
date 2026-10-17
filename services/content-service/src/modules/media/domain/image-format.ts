import type { MediaFormat, MediaRefusedFormat } from "@lavieco/shared/media";

export type SniffResult =
  | { kind: "accepted"; format: MediaFormat }
  | { kind: "refused"; format: MediaRefusedFormat }
  | null;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);

const JPEG = [0xff, 0xd8, 0xff] as const;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis"]);
const HEIF_BRANDS = new Set(["mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

/**
 * Identifies an image by its magic bytes, never by its name or declared type
 * (ADR-0020). HEIC/HEIF/AVIF are recognised so people get a clear message; every
 * other content, SVG included, is unknown and refused.
 */
export function sniffImageFormat(bytes: Uint8Array): SniffResult {
  if (startsWith(bytes, JPEG)) return { kind: "accepted", format: "jpeg" };
  if (startsWith(bytes, PNG)) return { kind: "accepted", format: "png" };
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { kind: "accepted", format: "webp" };
  }
  return sniffIsoMedia(bytes);
}

/** ISO base media file (`ftyp` box): major brand, then the compatible brands. */
function sniffIsoMedia(bytes: Uint8Array): SniffResult {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return null;
  const boxSize = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  const end = Math.min(Math.max(boxSize, 16), bytes.length, 256);
  const brands = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset, 4));
  if (brands.some((brand) => AVIF_BRANDS.has(brand))) return { kind: "refused", format: "avif" };
  if (brands.some((brand) => HEIC_BRANDS.has(brand))) return { kind: "refused", format: "heic" };
  if (brands.some((brand) => HEIF_BRANDS.has(brand))) return { kind: "refused", format: "heif" };
  return null;
}
