import {
  mediaSchema,
  memberAvatarSchema,
  type EventImagePurpose,
  type MediaAttachRequest,
  type MediaAttachmentRef,
} from "@lavieco/shared/media";

import { createHttpClient, type HttpClientOptions } from "./http-client";

const V1 = "/internal/v1";

export type ContentClientOptions = Omit<HttpClientOptions, "audience">;

/** An image file as the BFF received it from the browser. */
export type ImageFile = { bytes: Blob; filename: string };

const UPLOAD_TIMEOUT_MS = 30_000;
const segment = (value: string) => encodeURIComponent(value);

function imageForm(file: ImageFile, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  form.set("file", file.bytes, file.filename);
  return form;
}

/**
 * Typed client of content-service. Phase 2b: media (ADR-0020). Uploads are never
 * retried automatically (not idempotent); the caller shows the error and lets the
 * person try again.
 */
export function createContentClient(options: ContentClientOptions) {
  const http = createHttpClient({ ...options, audience: "content-service" });
  const service = { kind: "service" } as const;
  const user = (accessToken: string) => ({ kind: "user", accessToken }) as const;

  return {
    // --- admin (staff token, program:write) ---
    uploadEventImage: (
      accessToken: string,
      purpose: EventImagePurpose,
      file: ImageFile,
      requestId?: string,
    ) =>
      http.call({
        method: "POST",
        path: `${V1}/media/event-images`,
        auth: user(accessToken),
        form: imageForm(file, { purpose }),
        schema: mediaSchema,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        requestId,
      }),

    // --- web (member token, own avatar only) ---
    getMyAvatar: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/members/me/avatar`,
        auth: user(accessToken),
        schema: memberAvatarSchema,
        requestId,
      }),
    replaceMyAvatar: (accessToken: string, file: ImageFile, requestId?: string) =>
      http.call({
        method: "PUT",
        path: `${V1}/members/me/avatar`,
        auth: user(accessToken),
        form: imageForm(file),
        schema: memberAvatarSchema,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        requestId,
      }),
    removeMyAvatar: (accessToken: string, requestId?: string) =>
      http.call({
        method: "DELETE",
        path: `${V1}/members/me/avatar`,
        auth: user(accessToken),
        schema: memberAvatarSchema,
        requestId,
      }),

    // --- program-service (service token) ---
    attachMedia: (mediaId: string, body: MediaAttachRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/media/${segment(mediaId)}/attach`,
        auth: service,
        body,
        schema: mediaSchema,
        // Attaching twice for the same event is a no-op on the service side.
        idempotent: true,
        requestId,
      }),
    releaseMedia: (mediaId: string, ref: MediaAttachmentRef, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/media/${segment(mediaId)}/release`,
        auth: service,
        body: { ref },
        idempotent: true,
        requestId,
      }),
  };
}

export type ContentClient = ReturnType<typeof createContentClient>;
