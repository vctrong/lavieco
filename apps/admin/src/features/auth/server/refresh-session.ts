import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { appUrl } from "@/lib/app-url";
import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { clearStaffSessionOn, setStaffSessionOn } from "@/lib/session";
import { STAFF_COOKIES, safeNextPath } from "@/lib/session-cookies";

/**
 * `GET /api/auth/refresh?next=/...`: rotates the staff refresh token. A failure clears the
 * session; reuse of an old token has already revoked the whole family in identity-service.
 */
export async function handleStaffRefresh(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const refreshToken = request.cookies.get(STAFF_COOKIES.refresh)?.value;
  const toLogin = () => {
    const response = NextResponse.redirect(appUrl("/login"), 303);
    clearStaffSessionOn(response);
    return response;
  };
  if (!refreshToken) return toLogin();
  try {
    const tokens = await identityClient().refreshSession({ refreshToken }, await requestId());
    const response = NextResponse.redirect(appUrl(next), 303);
    setStaffSessionOn(response, tokens);
    return response;
  } catch {
    return toLogin();
  }
}
