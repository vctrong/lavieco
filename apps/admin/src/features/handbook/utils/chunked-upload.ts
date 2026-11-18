import {
  HANDBOOK_LIMITS,
  HANDBOOK_PAGE_PIXELS,
  type HandbookUploadKind,
} from "@lavieco/shared/content";

import { callAction } from "@/shared/call-action";

import { createUpload } from "../actions/handbook";

/**
 * Sends one file to the handbook in 6 MB chunks (admin requests are capped at 10 MB,
 * and phones lose connections): each chunk is retried a few times before giving up.
 */

const RETRIES = 3;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type FileCheck =
  { ok: true; kind: HandbookUploadKind } | { ok: false; reason: "type" | "too_large" };

export function checkHandbookFile(file: File): FileCheck {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isPdf && !isImage) return { ok: false, reason: "type" };
  const kind: HandbookUploadKind = isPdf ? "pdf" : "image";
  const max = isPdf ? HANDBOOK_LIMITS.pdfMaxBytes : HANDBOOK_LIMITS.imageMaxBytes;
  return file.size > max || file.size === 0
    ? { ok: false, reason: "too_large" }
    : { ok: true, kind };
}

/** True when an image is further than 3 % from A5 portrait (warning only). */
export async function imageAspectIsOff(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = bitmap.height / bitmap.width;
    bitmap.close();
    return (
      Math.abs(ratio - HANDBOOK_LIMITS.aspectRatio) / HANDBOOK_LIMITS.aspectRatio >
      HANDBOOK_LIMITS.aspectTolerance
    );
  } catch {
    return false;
  }
}

export const RECOMMENDED_SIZE = `${HANDBOOK_PAGE_PIXELS.width} × ${HANDBOOK_PAGE_PIXELS.height}`;

async function sendChunk(uploadId: string, index: number, chunk: Blob): Promise<boolean> {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const body = new FormData();
      body.set("chunk", chunk, "chunk");
      const response = await fetch(`/api/handbook/uploads/${uploadId}/chunks/${index}`, {
        method: "PUT",
        body,
      });
      if (response.ok) return true;
      // A refusal (wrong type, session) will not get better by retrying.
      if (response.status === 401 || response.status === 413 || response.status === 415)
        return false;
      const result = (await response.json().catch(() => null)) as { reason?: string } | null;
      if (result?.reason === "file_type_invalid" || result?.reason === "session_expired")
        return false;
    } catch {
      // Network blip: try again after a short pause.
    }
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
  return false;
}

export type UploadOutcome =
  | { ok: true; uploadId: string }
  | { ok: false; reason: "send" | "session_expired" | "type" | "too_large" };

export async function uploadHandbookFile(
  file: File,
  kind: HandbookUploadKind,
  onProgress: (sentBytes: number) => void,
): Promise<UploadOutcome> {
  const created = await callAction(() =>
    createUpload({ kind, fileName: file.name.slice(0, 200) || "file", size: file.size }),
  );
  if (created.status !== "ok") {
    return { ok: false, reason: created.reason === "session_expired" ? "session_expired" : "send" };
  }
  const { id, chunkBytes, chunks } = created.data;
  for (let index = 0; index < chunks; index += 1) {
    const start = index * chunkBytes;
    const chunk = file.slice(start, Math.min(file.size, start + chunkBytes));
    if (!(await sendChunk(id, index, chunk))) return { ok: false, reason: "send" };
    onProgress(Math.min(file.size, start + chunkBytes));
  }
  return { ok: true, uploadId: id };
}
