/**
 * Names of the member session cookies. Kept free of server-only imports because
 * `proxy.ts` reads them too (only to redirect; it never trusts them).
 */
export const MEMBER_COOKIES = {
  access: "lv_member_at",
  refresh: "lv_member_rt",
  oauth: "lv_oauth",
} as const;

/** Where to go after sign-in; only same-site relative paths are accepted (no open redirect). */
export function safeNextPath(value: string | null | undefined, fallback = "/tai-khoan"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
