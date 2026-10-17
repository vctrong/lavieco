import { NextResponse, type NextRequest } from "next/server";

import { adminOrigin } from "@/lib/env";
import { MEMBER_COOKIES } from "@/lib/session-cookies";

const ACCOUNT_PREFIX = "/tai-khoan";
const SIGN_IN_PAGES = new Set(["/dang-nhap", "/dang-ky"]);
/** Event preview: the only page another origin (admin) may embed (D2). */
const PREVIEW_PREFIX = "/xem-truoc/";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
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
    const url = new URL("/dang-nhap", request.url);
    url.searchParams.set("tiep", `${pathname}${search}`);
    response = NextResponse.redirect(url);
  } else if (SIGN_IN_PAGES.has(pathname) && hasSession) {
    response = NextResponse.redirect(new URL(ACCOUNT_PREFIX, request.url));
  } else {
    response = NextResponse.next();
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  setFramingHeaders(response, pathname);
  return response;
}

/**
 * Every page refuses to be framed, except the preview, which only the admin origin
 * may embed. Without a valid ADMIN_APP_URL the preview is not frameable either.
 */
function setFramingHeaders(response: NextResponse, pathname: string) {
  const admin = pathname.startsWith(PREVIEW_PREFIX) ? adminOrigin() : null;
  if (admin) {
    response.headers.set("content-security-policy", `frame-ancestors ${admin}`);
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return;
  }
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("content-security-policy", "frame-ancestors 'none'");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.png|opengraph-image).*)"],
};
