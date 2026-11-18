import { z } from "zod";

import {
  handbookImportJobSchema,
  handbookOverviewSchema,
  handbookPreviewTokenSchema,
  handbookPublishResultSchema,
  handbookPublishedTextSchema,
  handbookSearchResultSchema,
  handbookUploadSchema,
  handbookVersionSchema,
  publicHandbookPageDetailSchema,
  publicHandbookSchema,
  type HandbookDraftCreate,
  type HandbookImportCreate,
  type HandbookPageUpdate,
  type HandbookPublishRequest,
  type HandbookRestoreRequest,
  type HandbookStructureUpdate,
  type HandbookUploadCreate,
} from "@lavieco/shared/content";
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

    uploadProductImage: (accessToken: string, file: ImageFile, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/media/product-images`,
        auth: user(accessToken),
        form: imageForm(file, {}),
        schema: mediaSchema,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        requestId,
      }),

    // --- admin: handbook (staff token, handbook:read|write|publish, ADR-0029) ---
    getHandbook: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/handbook`,
        auth: user(accessToken),
        schema: handbookOverviewSchema,
        requestId,
      }),
    startHandbookDraft: (accessToken: string, body: HandbookDraftCreate, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/draft`,
        auth: user(accessToken),
        body,
        schema: handbookVersionSchema,
        requestId,
      }),
    updateHandbookStructure: (
      accessToken: string,
      body: HandbookStructureUpdate,
      requestId?: string,
    ) =>
      http.call({
        method: "PUT",
        path: `${V1}/handbook/draft/structure`,
        auth: user(accessToken),
        body,
        schema: handbookVersionSchema,
        requestId,
      }),
    updateHandbookPage: (
      accessToken: string,
      pageId: string,
      body: HandbookPageUpdate,
      requestId?: string,
    ) =>
      http.call({
        method: "PATCH",
        path: `${V1}/handbook/draft/pages/${segment(pageId)}`,
        auth: user(accessToken),
        body,
        schema: handbookVersionSchema,
        requestId,
      }),
    discardHandbookDraft: (accessToken: string, revision: number, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/draft/discard`,
        auth: user(accessToken),
        body: { revision },
        requestId,
      }),
    publishHandbook: (accessToken: string, body: HandbookPublishRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/draft/publish`,
        auth: user(accessToken),
        body,
        schema: handbookPublishResultSchema,
        requestId,
      }),
    restoreHandbook: (accessToken: string, body: HandbookRestoreRequest, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/restore`,
        auth: user(accessToken),
        body,
        schema: handbookPublishResultSchema,
        requestId,
      }),
    createHandbookPreviewToken: (accessToken: string, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/draft/preview-tokens`,
        auth: user(accessToken),
        schema: handbookPreviewTokenSchema,
        requestId,
      }),
    createHandbookUpload: (accessToken: string, body: HandbookUploadCreate, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/uploads`,
        auth: user(accessToken),
        body,
        schema: handbookUploadSchema,
        requestId,
      }),
    sendHandbookChunk: (
      accessToken: string,
      uploadId: string,
      index: number,
      chunk: Blob,
      requestId?: string,
    ) => {
      const form = new FormData();
      form.set("chunk", chunk, "chunk");
      return http.call({
        method: "PUT",
        path: `${V1}/handbook/uploads/${segment(uploadId)}/chunks/${index}`,
        auth: user(accessToken),
        form,
        schema: handbookUploadSchema,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        requestId,
      });
    },
    createHandbookImport: (accessToken: string, body: HandbookImportCreate, requestId?: string) =>
      http.call({
        method: "POST",
        path: `${V1}/handbook/imports`,
        auth: user(accessToken),
        body,
        schema: handbookImportJobSchema,
        requestId,
      }),
    listHandbookImports: (accessToken: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/handbook/imports`,
        auth: user(accessToken),
        schema: z.object({ items: z.array(handbookImportJobSchema) }),
        requestId,
      }),
    getHandbookImport: (accessToken: string, jobId: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/handbook/imports/${segment(jobId)}`,
        auth: user(accessToken),
        schema: handbookImportJobSchema,
        requestId,
      }),

    // --- web: published handbook (service token, ADR-0029) ---
    getPublishedHandbook: (requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-handbook`,
        auth: service,
        schema: publicHandbookSchema,
        idempotent: true,
        requestId,
      }),
    getPublishedHandbookPage: (key: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-handbook/pages/${segment(key)}`,
        auth: service,
        schema: publicHandbookPageDetailSchema,
        idempotent: true,
        requestId,
      }),
    searchHandbook: (query: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-handbook/search?q=${encodeURIComponent(query)}`,
        auth: service,
        schema: handbookSearchResultSchema,
        idempotent: true,
        requestId,
      }),
    getHandbookText: (cursor: number, limit: number, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-handbook/text?cursor=${cursor}&limit=${limit}`,
        auth: service,
        schema: handbookPublishedTextSchema,
        idempotent: true,
        requestId,
      }),
    getHandbookPreview: (token: string, requestId?: string) =>
      http.call({
        method: "GET",
        path: `${V1}/published-handbook/previews/${segment(token)}`,
        auth: service,
        schema: publicHandbookSchema,
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
