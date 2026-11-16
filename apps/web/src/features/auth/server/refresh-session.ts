import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { requestId } from "@/lib/request-meta";
import { memberRefresher } from "@/lib/member-token";
import { clearMemberSessionOn, setMemberSessionOn } from "@/lib/session";
import { MEMBER_COOKIES, safeNextPath } from "@/lib/session-cookies";
import { siteUrl } from "@/lib/site-url";

import { NEXT_PARAM, ROUTES } from "../constants/config";

/**
 * `GET /api/auth/refresh?tiep=/...`: rotates the refresh token and returns to the page.
 * Server Components cannot set cookies, so pages whose access token expired come here.
 * A failure (expired, revoked, reused token) clears the session and asks to sign in.
 */
export async function handleSessionRefresh(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get(NEXT_PARAM));
  const refreshToken = request.cookies.get(MEMBER_COOKIES.refresh)?.value;
  const toLogin = () => {
    const url = siteUrl(ROUTES.login);
    url.searchParams.set(NEXT_PARAM, next);
    const response = NextResponse.redirect(url, 303);
    clearMemberSessionOn(response);
    return response;
  };
  if (!refreshToken) return toLogin();

  try {
    // Shared with Server Actions, so a page load and an action never rotate one token twice.
    const tokens = await memberRefresher()(refreshToken, await requestId());
    const response = NextResponse.redirect(siteUrl(next), 303);
    setMemberSessionOn(response, tokens);
    return response;
  } catch {
    return toLogin();
  }
}
