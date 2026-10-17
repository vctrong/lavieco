import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";
import { MEDIA_LIMITS, checkImageFile, type Media } from "@lavieco/shared/media";

import { publicEnv } from "@/lib/env.public";
import { requestId } from "@/lib/request-meta";
import { contentClient, webLogger } from "@/lib/services";
import { readMemberSession } from "@/lib/session";

import type { AvatarFailure, AvatarResult } from "../types";

/** Room for the multipart envelope around the largest accepted avatar. */
const MAX_REQUEST_BYTES = MEDIA_LIMITS.maxBytes.avatar + 64 * 1024;

const FAILURE_BY_CODE: Partial<Record<ErrorCode, AvatarFailure>> = {
  "common.unauthenticated": "session_expired",
  "media.type_unsupported": "type_unsupported",
  "media.format_refused": "format_refused",
  "media.too_large": "too_large",
  "media.image_invalid": "image_invalid",
  "media.too_many_pixels": "too_many_pixels",
};

const fail = (reason: AvatarFailure, format?: string): AvatarResult => ({
  status: "error",
  reason,
  ...(format ? { format } : {}),
});

function respond(result: AvatarResult): Response {
  const status = result.status === "ok" ? 200 : result.reason === "session_expired" ? 401 : 400;
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Same-origin only. The member cookie is `SameSite=Lax`, which already keeps it off
 * cross-site POSTs; checking Origin as well costs nothing.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(publicEnv.siteUrl).origin;
}

function toFailure(error: unknown): AvatarResult {
  if (isServiceProblem(error)) {
    const reason = FAILURE_BY_CODE[error.code];
    if (reason) {
      return fail(reason, reason === "format_refused" ? error.problem.detail : undefined);
    }
  }
  webLogger().warn("avatar change failed", {
    errorCode: isServiceProblem(error) ? error.code : "unavailable",
  });
  return fail("unavailable");
}

/** `POST /api/account/avatar`: replace the avatar (ADR-0020; the old file is deleted). */
export async function handleAvatarUpload(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return respond(fail("unavailable"));
  const { accessToken } = await readMemberSession();
  if (!accessToken) return respond(fail("session_expired"));
  if (Number(request.headers.get("content-length") ?? "0") > MAX_REQUEST_BYTES) {
    return respond(fail("too_large"));
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respond(fail("type_unsupported"));
  }
  const file = form.get("file");
  if (!(file instanceof File)) return respond(fail("type_unsupported"));
  const issue = checkImageFile(file, "avatar");
  if (issue) {
    return respond(fail(issue.code, issue.code === "format_refused" ? issue.format : undefined));
  }
  try {
    const { avatar } = await contentClient().replaceMyAvatar(
      accessToken,
      { bytes: file, filename: file.name || "avatar" },
      await requestId(),
    );
    return respond({ status: "ok", avatar });
  } catch (error) {
    return respond(toFailure(error));
  }
}

/** `DELETE /api/account/avatar`: remove the avatar; its file is deleted. */
export async function handleAvatarRemoval(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return respond(fail("unavailable"));
  const { accessToken } = await readMemberSession();
  if (!accessToken) return respond(fail("session_expired"));
  try {
    await contentClient().removeMyAvatar(accessToken, await requestId());
    return respond({ status: "ok", avatar: null });
  } catch (error) {
    return respond(toFailure(error));
  }
}

/** For the account page. A content-service hiccup must not break the page: no avatar then. */
export async function getMyAvatar(accessToken: string): Promise<Media | null> {
  try {
    return (await contentClient().getMyAvatar(accessToken, await requestId())).avatar;
  } catch (error) {
    webLogger().warn("avatar lookup failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return null;
  }
}
