import { NextResponse, type NextRequest } from "next/server";

import { STAFF_COOKIES } from "@/lib/session-cookies";

/** Pages reachable without a staff session. */
const PUBLIC_PATHS = ["/login", "/2fa", "/accept-invite", "/api/auth/refresh"];

const SECURITY_HEADERS: Record<string, string> = {
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  // Camera is kept for the door check-in scanner (docs/05 §5.6).
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
};

/**
 * UX redirect to /login when there is no staff session, plus noindex and security
 * headers (docs/02 §5.2). NOT a security barrier: layouts, Server Actions and every
 * service check the session and permissions themselves (docs/02 §9.3).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const hasSession = request.cookies.has(STAFF_COOKIES.refresh);

  let response: NextResponse;
  if (!isPublic && !hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
