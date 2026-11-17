import "server-only";

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { cartTokenSchema } from "@lavieco/shared/shop";

import { serverEnv } from "./env";

/** Opaque key of the shop cart (docs/08 §4.6): the service stores only its hash. */
export const CART_COOKIE = "lv_cart";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** The cart token of this browser, or null (never created before the first add). */
export async function readCartToken(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && cartTokenSchema.safeParse(value).success ? value : null;
}

/**
 * The token, created and set on first use. Only from a Server Action or Route Handler:
 * Server Components cannot write cookies.
 */
export async function ensureCartToken(): Promise<string> {
  const existing = await readCartToken();
  const token = existing ?? randomBytes(32).toString("base64url");
  // Refreshed on every write: an active cart does not expire under the visitor.
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv().NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}
