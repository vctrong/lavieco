/** Staff session cookie names; shared with `proxy.ts`, which only redirects on them. */
export const STAFF_COOKIES = {
  access: "lv_admin_at",
  refresh: "lv_admin_rt",
  /** Between the password step and the second factor (5 minutes). */
  mfa: "lv_admin_mfa",
} as const;

/** Only same-site relative paths are accepted after sign-in (no open redirect). */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
