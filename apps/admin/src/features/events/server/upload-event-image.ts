import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import {
  MEDIA_LIMITS,
  checkImageFile,
  eventImageUploadFieldsSchema,
  type Media,
} from "@lavieco/shared/media";

import { requestId } from "@/lib/request-meta";
import { adminLogger, contentClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import type { UploadFailure, UploadResult } from "../types";

/** Room for the multipart envelope around the largest accepted image. */
const MAX_REQUEST_BYTES = MEDIA_LIMITS.maxBytes.event_cover + 64 * 1024;

const FAILURE_BY_CODE: Partial<Record<ErrorCode, UploadFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "media.type_unsupported": "type_unsupported",
  "media.format_refused": "format_refused",
  "media.too_large": "too_large",
  "media.image_invalid": "image_invalid",
  "media.too_many_pixels": "too_many_pixels",
};

const fail = (reason: UploadFailure, format?: string): UploadResult => ({
  status: "error",
  reason,
  ...(format ? { format } : {}),
});

/** `POST /api/media/event-images` (Route Handler: Server Actions cap bodies at 1 MB). */
export async function handleEventImageUpload(request: Request): Promise<Response> {
  const result = await uploadEventImage(request);
  const status = result.status === "ok" ? 201 : result.reason === "session_expired" ? 401 : 400;
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}

/**
 * BFF of the event image picker (ADR-0020): the browser never talks to content-service
 * or Cloudinary. Refuses oversized requests before reading them, repeats the early file
 * check, then forwards with the staff token; content-service checks the real content.
 */
export async function uploadEventImage(request: Request): Promise<UploadResult> {
  const { accessToken } = await readStaffSession();
  if (!accessToken) return fail("session_expired");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST_BYTES) return fail("too_large");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("type_unsupported");
  }
  const file = form.get("file");
  const fields = eventImageUploadFieldsSchema.safeParse({ purpose: form.get("purpose") });
  if (!(file instanceof File) || !fields.success) return fail("type_unsupported");
  const issue = checkImageFile(file, fields.data.purpose);
  if (issue) return fail(issue.code, issue.code === "format_refused" ? issue.format : undefined);

  try {
    const media: Media = await contentClient().uploadEventImage(
      accessToken,
      fields.data.purpose,
      { bytes: file, filename: file.name || "image" },
      await requestId(),
    );
    return { status: "ok", media };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) {
        return fail(reason, reason === "format_refused" ? error.problem.detail : undefined);
      }
    }
    adminLogger().warn("event image upload failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return fail("unavailable");
  }
}
