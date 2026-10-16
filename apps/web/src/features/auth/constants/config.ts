/**
 * Version of the data-processing consent shown on the sign-up form, stored with the
 * account and its timestamp (BR-06). Bump it whenever `TEXT.vi.signup.consent` changes.
 */
export const MEMBER_CONSENT_VERSION = "member-2026-10";

export const OTP_LENGTH = 6;

export const ROUTES = {
  login: "/dang-nhap",
  signup: "/dang-ky",
  reset: "/quen-mat-khau",
  account: "/tai-khoan",
  googleStart: "/api/auth/google/start",
  googleCallback: "/api/auth/google/callback",
} as const;

/** Query parameter carrying the page to return to after sign-in. */
export const NEXT_PARAM = "tiep";
/** Query parameter carrying an error code to show (Google sign-in returns). */
export const ERROR_PARAM = "loi";

/** Short-lived cookie holding the OAuth state + PKCE verifier between start and callback. */
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
