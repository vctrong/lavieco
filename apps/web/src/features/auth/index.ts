import type { Metadata } from "next";

import { TEXT } from "./constants/text";

export {
  LoginPage,
  ResetPasswordPage,
  SignupPage,
  type AuthSearchParams,
} from "./components/auth-pages";
export { handleGoogleCallback, handleGoogleStart } from "./server/google-oauth";
export { handleSessionRefresh } from "./server/refresh-session";
export { ROUTES as AUTH_ROUTES, NEXT_PARAM } from "./constants/config";

const noIndex = { index: false, follow: false } as const;

export const loginMetadata: Metadata = { title: TEXT.vi.meta.login, robots: noIndex };
export const signupMetadata: Metadata = { title: TEXT.vi.meta.signup, robots: noIndex };
export const resetPasswordMetadata: Metadata = { title: TEXT.vi.meta.reset, robots: noIndex };
