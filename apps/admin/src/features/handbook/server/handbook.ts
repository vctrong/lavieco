import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import { HANDBOOK_LIMITS, handbookUploadSchema } from "@lavieco/shared/content";

import { failureKind, refOf } from "@/lib/action-errors";
import { appUrl } from "@/lib/app-url";
import { serverEnv } from "@/lib/env";
import { requestId } from "@/lib/request-meta";
import { adminLogger, contentClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";
import { withStaffToken } from "@/lib/staff-token";

import type { HandbookFailure, HandbookResult } from "../types";

/** Reads for Server Components: an expired token goes through the refresh route. */
async function read<T>(path: string, run: (token: string, id: string) => Promise<T>): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");
  try {
    return await run(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refresh : "/login");
    }
    throw error;
  }
}

export function loadHandbook(path = "/handbook") {
  return read(path, (token, id) => contentClient().getHandbook(token, id));
}

export function loadHandbookImports() {
  return read("/handbook", (token, id) => contentClient().listHandbookImports(token, id));
}

const FAILURE_BY_CODE: Partial<Record<ErrorCode, HandbookFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.not_found": "not_found",
  "common.conflict": "conflict",
  "common.validation_failed": "invalid",
  "handbook.no_draft": "no_draft",
  "handbook.draft_exists": "draft_exists",
  "handbook.publish_blocked": "publish_blocked",
  "handbook.structure_invalid": "structure_invalid",
  "handbook.page_unknown": "page_unknown",
  "handbook.version_unknown": "version_unknown",
  "handbook.version_not_restorable": "version_not_restorable",
  "handbook.upload_invalid": "upload_invalid",
  "handbook.file_type_invalid": "file_type_invalid",
};

/** Runs a call with the staff token; content-service checks `handbook:*` itself. */
export async function callHandbook<T>(
  context: string,
  run: (token: string, id: string) => Promise<T>,
): Promise<HandbookResult<T>> {
  const id = await requestId();
  try {
    const call = await withStaffToken(id, (token) => run(token, id));
    if (call.session === "expired") return { status: "error", reason: "session_expired" };
    return { status: "ok", data: call.value };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) {
        return {
          status: "error",
          reason,
          ...(error.problem.detail ? { detail: error.problem.detail } : {}),
        };
      }
    }
    adminLogger().warn("handbook action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * `PUT /api/handbook/uploads/[id]/chunks/[index]` (Route Handler: Server Actions cap
 * bodies at 1 MB). One ≤ 6 MB piece of a PDF or page image, forwarded as is with the
 * staff token; content-service checks order, length and the real file type.
 */
export async function handleHandbookChunk(
  request: Request,
  uploadId: string,
  index: string,
): Promise<Response> {
  if (!/^[0-9a-f]{24}$/.test(uploadId) || !/^\d{1,4}$/.test(index)) {
    return json({ status: "error", reason: "upload_invalid" }, 400);
  }
  if (
    Number(request.headers.get("content-length") ?? "0") >
    HANDBOOK_LIMITS.chunkBytes + 64 * 1024
  ) {
    return json({ status: "error", reason: "upload_invalid" }, 413);
  }
  let chunk: FormDataEntryValue | null;
  try {
    chunk = (await request.formData()).get("chunk");
  } catch {
    return json({ status: "error", reason: "upload_invalid" }, 400);
  }
  if (!(chunk instanceof Blob)) return json({ status: "error", reason: "upload_invalid" }, 400);
  const result = await callHandbook("handbook.chunk", (token, id) =>
    contentClient().sendHandbookChunk(token, uploadId, Number(index), chunk, id),
  );
  if (result.status === "ok")
    return json({ status: "ok", upload: handbookUploadSchema.parse(result.data) }, 200);
  return json(result, result.reason === "session_expired" ? 401 : 400);
}

/**
 * `GET /handbook/preview`: every click mints a fresh 10-minute token and opens the draft
 * on `web` (noindex), like event previews (D2).
 */
export async function handbookPreviewRedirect(): Promise<NextResponse> {
  const go = (url: URL) => {
    const response = NextResponse.redirect(url, 302);
    response.headers.set("cache-control", "no-store");
    return response;
  };
  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = appUrl(`/api/auth/refresh?next=${encodeURIComponent("/handbook/preview")}`);
  if (!accessToken) return go(refreshToken ? refresh : appUrl("/login"));
  try {
    const { token } = await contentClient().createHandbookPreviewToken(
      accessToken,
      await requestId(),
    );
    return go(new URL(`/xem-truoc/cam-nang/${encodeURIComponent(token)}`, serverEnv().WEB_APP_URL));
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      return go(refreshToken ? refresh : appUrl("/login"));
    }
    const back = appUrl("/handbook");
    back.searchParams.set("xem-truoc", "loi");
    return go(back);
  }
}
