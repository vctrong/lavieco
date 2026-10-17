"use client";

import { useState } from "react";

import { checkImageFile, type EventImagePurpose } from "@lavieco/shared/media";

import { TEXT } from "../constants/text";
import type { UploadFailure, UploadResult } from "../types";
import type { EventImageValue } from "../utils/details-values";

const t = TEXT.vi.images;

function messageOf(reason: UploadFailure, format?: string) {
  return t.errors[reason].replace("{format}", (format ?? "HEIC").toUpperCase());
}

/**
 * Uploads one image through the admin BFF. The same early check as the service runs
 * first, so a HEIC photo or a 20 MB file is refused before anything is sent.
 */
export function useImageUpload(purpose: EventImagePurpose) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, alt = ""): Promise<EventImageValue | null> {
    setError(null);
    const issue = checkImageFile(file, purpose);
    if (issue) {
      setError(messageOf(issue.code, issue.code === "format_refused" ? issue.format : undefined));
      return null;
    }
    const body = new FormData();
    body.set("purpose", purpose);
    body.set("file", file);
    setBusy(true);
    try {
      const response = await fetch("/api/media/event-images", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as UploadResult | null;
      if (result?.status === "ok") {
        const { id, publicId, width, height } = result.media;
        return { mediaId: id, publicId, width, height, alt };
      }
      setError(
        result?.status === "error"
          ? messageOf(result.reason, result.format)
          : messageOf("unavailable"),
      );
      return null;
    } catch {
      setError(messageOf("unavailable"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, error, clearError: () => setError(null) };
}
