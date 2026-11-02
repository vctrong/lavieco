import "server-only";

import { NextResponse } from "next/server";

import { isServiceProblem } from "@lavieco/api-clients";

import { appUrl } from "@/lib/app-url";
import { serverEnv } from "@/lib/env";
import { requestId } from "@/lib/request-meta";
import { programClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

import {
  PREVIEW_ERROR_PARAM,
  PREVIEW_ERROR_VALUE,
  PREVIEW_EVENT_PARAM,
  previewPath,
} from "../constants/preview";

const go = (url: URL) => {
  const response = NextResponse.redirect(url, 302);
  response.headers.set("cache-control", "no-store");
  return response;
};

/**
 * `GET /events/[id]/preview` (D2): every click mints a fresh 10-minute token and goes to
 * the public-looking page on `web`, so a preview never expires under the editor's hands.
 * program-service checks `program:read`; this only turns its answer into a redirect.
 */
export async function previewRedirect(eventId: string): Promise<NextResponse> {
  const failed = appUrl("/events");
  failed.searchParams.set(PREVIEW_ERROR_PARAM, PREVIEW_ERROR_VALUE);
  if (!/^[0-9a-f]{24}$/.test(eventId)) return go(failed);

  const { accessToken, refreshToken } = await readStaffSession();
  const refresh = appUrl(`/api/auth/refresh?next=${encodeURIComponent(previewPath(eventId))}`);
  if (!accessToken) return go(refreshToken ? refresh : appUrl("/login"));
  try {
    const { token } = await programClient().createEventPreviewToken(
      accessToken,
      eventId,
      await requestId(),
    );
    const target = new URL(
      `/xem-truoc/chuong-trinh/${encodeURIComponent(token)}`,
      serverEnv().WEB_APP_URL,
    );
    // Lets the page offer "Làm mới" back to this route, even once the token has expired.
    target.searchParams.set(PREVIEW_EVENT_PARAM, eventId);
    return go(target);
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      return go(refreshToken ? refresh : appUrl("/login"));
    }
    return go(failed);
  }
}
