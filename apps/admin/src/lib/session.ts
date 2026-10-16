import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { TokenPair } from "@lavieco/shared/identity";

import { serverEnv } from "./env";
import { STAFF_COOKIES } from "./session-cookies";

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));
}

/** httpOnly, Secure in production, SameSite=Strict, scoped to the admin host (docs/02 §9.2). */
function baseOptions() {
  return {
    httpOnly: true as const,
    secure: serverEnv().NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

function entries(tokens: TokenPair) {
  return [
    {
      name: STAFF_COOKIES.access,
      value: tokens.accessToken,
      maxAge: secondsUntil(tokens.accessTokenExpiresAt),
    },
    {
      name: STAFF_COOKIES.refresh,
      value: tokens.refreshToken,
      maxAge: secondsUntil(tokens.refreshTokenExpiresAt),
    },
  ];
}

export async function setStaffSession(tokens: TokenPair) {
  const store = await cookies();
  for (const entry of entries(tokens)) {
    store.set(entry.name, entry.value, { ...baseOptions(), maxAge: entry.maxAge });
  }
  store.delete(STAFF_COOKIES.mfa);
}

export function setStaffSessionOn(response: NextResponse, tokens: TokenPair) {
  for (const entry of entries(tokens)) {
    response.cookies.set(entry.name, entry.value, { ...baseOptions(), maxAge: entry.maxAge });
  }
}

export async function clearStaffSession() {
  const store = await cookies();
  store.delete(STAFF_COOKIES.access);
  store.delete(STAFF_COOKIES.refresh);
  store.delete(STAFF_COOKIES.mfa);
}

export function clearStaffSessionOn(response: NextResponse) {
  response.cookies.delete(STAFF_COOKIES.access);
  response.cookies.delete(STAFF_COOKIES.refresh);
}

export async function readStaffSession() {
  const store = await cookies();
  return {
    accessToken: store.get(STAFF_COOKIES.access)?.value ?? null,
    refreshToken: store.get(STAFF_COOKIES.refresh)?.value ?? null,
  };
}

/** Holds the second-factor token between the two login steps. */
export async function setPendingMfa(token: string, expiresAtIso: string) {
  const store = await cookies();
  store.set(STAFF_COOKIES.mfa, token, { ...baseOptions(), maxAge: secondsUntil(expiresAtIso) });
}

export async function readPendingMfa(): Promise<string | null> {
  return (await cookies()).get(STAFF_COOKIES.mfa)?.value ?? null;
}
