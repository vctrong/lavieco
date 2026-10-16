import { NextResponse, type NextRequest } from "next/server";

import { MEMBER_COOKIES } from "@/lib/session-cookies";

const ACCOUNT_PREFIX = "/tai-khoan";
const SIGN_IN_PAGES = new Set(["/dang-nhap", "/dang-ky"]);

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
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
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.png|opengraph-image).*)"],
};
