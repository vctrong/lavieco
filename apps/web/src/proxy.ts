import { NextResponse, type NextRequest } from "next/server";

import { MEMBER_COOKIES } from "@/lib/session-cookies";
import { siteUrl } from "@/lib/site-url";

const ACCOUNT_PREFIX = "/tai-khoan";
const SIGN_IN_PAGES = new Set(["/dang-nhap", "/dang-ky"]);
/** Event preview (D2): opened in its own tab, must never reach a search index. */
const PREVIEW_PREFIX = "/xem-truoc/";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  // camera=(self): LaviAgent's webcam dialog (getUserMedia) on this site only; never
  // delegated to other origins or frames (ADR-0024 §9). Microphone and location stay off.
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
};

/**
 * Navigation only (docs/04 §5.1): sends visitors without a session to the sign-in page
 * and signed-in members away from it, and adds light security headers. NOT a security
 * barrier: the account page and identity-service check the session themselves.
 * TODO(UC-28): "sắp ra mắt" gate once the site settings exist in content-service.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(MEMBER_COOKIES.refresh);

  let response: NextResponse;
  if (pathname.startsWith(ACCOUNT_PREFIX) && !hasSession) {
    const url = siteUrl("/dang-nhap");
    url.searchParams.set("tiep", `${pathname}${search}`);
    response = NextResponse.redirect(url);
  } else if (SIGN_IN_PAGES.has(pathname) && hasSession) {
    response = NextResponse.redirect(siteUrl(ACCOUNT_PREFIX));
  } else {
    response = NextResponse.next();
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  // Every page refuses to be framed.
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("content-security-policy", "frame-ancestors 'none'");
  if (pathname.startsWith(PREVIEW_PREFIX)) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.png|opengraph-image).*)"],
};
