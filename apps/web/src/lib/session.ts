import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { TokenPair } from "@lavieco/shared/identity";

import { serverEnv } from "./env";
import { MEMBER_COOKIES } from "./session-cookies";

type CookieEntry = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
  };
};

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));
}

/**
 * Member session cookies (docs/02 §9.2): httpOnly, Secure in production,
 * `SameSite=Lax` so a member arriving from an email link or the Google redirect is
 * recognised; Server Actions are additionally protected by Next's Origin check.
 */
function sessionCookies(tokens: TokenPair): CookieEntry[] {
  const options = {
    httpOnly: true as const,
    secure: serverEnv().NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/" as const,
  };
  return [
    {
      name: MEMBER_COOKIES.access,
      value: tokens.accessToken,
      options: { ...options, maxAge: secondsUntil(tokens.accessTokenExpiresAt) },
    },
    {
      name: MEMBER_COOKIES.refresh,
      value: tokens.refreshToken,
      options: { ...options, maxAge: secondsUntil(tokens.refreshTokenExpiresAt) },
    },
  ];
}

/** From a Server Action. */
export async function setMemberSession(tokens: TokenPair) {
  const store = await cookies();
  for (const cookie of sessionCookies(tokens)) store.set(cookie.name, cookie.value, cookie.options);
}

/** From a Route Handler, on the response it returns (e.g. a redirect). */
export function setMemberSessionOn(response: NextResponse, tokens: TokenPair) {
  for (const cookie of sessionCookies(tokens)) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
}

export async function clearMemberSession() {
  const store = await cookies();
  store.delete(MEMBER_COOKIES.access);
  store.delete(MEMBER_COOKIES.refresh);
}

export function clearMemberSessionOn(response: NextResponse) {
  response.cookies.delete(MEMBER_COOKIES.access);
  response.cookies.delete(MEMBER_COOKIES.refresh);
}

/** Reads the session cookies (Server Components included). */
export async function readMemberSession() {
  const store = await cookies();
  return {
    accessToken: store.get(MEMBER_COOKIES.access)?.value ?? null,
    refreshToken: store.get(MEMBER_COOKIES.refresh)?.value ?? null,
  };
}
