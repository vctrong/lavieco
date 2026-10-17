import {
  MEDIA_LIMITS,
  MEDIA_REFUSED_FORMATS,
  type MediaPurpose,
  type MediaRefusedFormat,
} from "./limits";

/** What a browser `File` tells us before upload (name, declared type, size). */
export type FileFacts = { name: string; type: string; size: number };

export type FileCheckIssue =
  | { code: "format_refused"; format: MediaRefusedFormat }
  | { code: "type_unsupported" }
  | { code: "too_large"; maxBytes: number };

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

/**
 * Early check in the browser so people get a clear message before waiting for an
 * upload. It trusts the name and declared type, so it is only for experience: the
 * service checks the real content again (ADR-0020).
 */
export function checkImageFile(file: FileFacts, purpose: MediaPurpose): FileCheckIssue | null {
  const extension = file.name.includes(".") ? (file.name.split(".").pop() ?? "").toLowerCase() : "";
  const declared = file.type.toLowerCase();
  const refused = MEDIA_REFUSED_FORMATS.find(
    (format) => extension === format || declared === `image/${format}`,
  );
  if (refused) return { code: "format_refused", format: refused };
  const typeOk = declared ? ACCEPTED_TYPES.has(declared) : ACCEPTED_EXTENSIONS.has(extension);
  if (!typeOk) return { code: "type_unsupported" };
  const maxBytes = MEDIA_LIMITS.maxBytes[purpose];
  if (file.size > maxBytes) return { code: "too_large", maxBytes };
  return null;
}
