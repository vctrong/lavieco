/** Staff session cookie names; shared with `proxy.ts`, which only redirects on them. */
export const STAFF_COOKIES = {
  access: "lv_admin_at",
  refresh: "lv_admin_rt",
  /** Between the password step and the second factor (5 minutes). */
  mfa: "lv_admin_mfa",
} as const;

/**
 * Admin sections that have pages (`app/(dashboard)/<section>`), the only places a
 * sign-in may return to besides "/". A test keeps this list in sync with the folders.
 */
export const RETURN_SECTIONS = ["/events", "/orders", "/checkin"] as const;

/** Base for parsing a relative path; never used as a destination. */
const PARSE_BASE = "http://admin.invalid";

/**
 * Where to go after sign-in: a same-site path of a known admin section, else `fallback`.
 * Rejects absolute and protocol-relative URLs, backslashes (browsers read `/\` as `//`)
 * and paths of other apps (e.g. the web's `/dang-nhap`, which would 404 here).
 */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== PARSE_BASE) return fallback;
  const { pathname } = url;
  const known =
    pathname === "/" ||
    RETURN_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
  return known ? `${pathname}${url.search}${url.hash}` : fallback;
}
