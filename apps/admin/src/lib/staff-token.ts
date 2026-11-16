import "server-only";

import {
  createSessionRefresher,
  isServiceProblem,
  type SessionRefresher,
} from "@lavieco/api-clients";

import { adminLogger, identityClient } from "./services";
import { readStaffSession, setStaffSession } from "./session";

export type StaffCall<T> = { session: "ok"; value: T } | { session: "expired" };

/**
 * One refresher per process, kept on `globalThis` because Next bundles this module into
 * several route chunks: a page's `/api/auth/refresh` and a Server Action fired at the same
 * moment must share it, or they would rotate the same token twice and lose the session.
 */
const KEY = Symbol.for("lavieco.admin.staffRefresher");
type Holder = { [KEY]?: SessionRefresher };

export function staffRefresher(): SessionRefresher {
  const holder = globalThis as Holder;
  holder[KEY] ??= createSessionRefresher((refreshToken, requestId) =>
    identityClient().refreshSession({ refreshToken }, requestId),
  );
  return holder[KEY];
}

const isUnauthenticated = (error: unknown) =>
  isServiceProblem(error) && error.code === "common.unauthenticated";

/** New access token from the refresh cookie, written back as cookies; null if it cannot be had. */
async function renew(refreshToken: string | null, requestId: string): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const tokens = await staffRefresher()(refreshToken, requestId);
    await setStaffSession(tokens);
    return tokens.accessToken;
  } catch (error) {
    adminLogger().info("staff session refresh failed", {
      requestId,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return null;
  }
}

/**
 * Runs a service call with the staff access token from a Server Action or Route Handler
 * (both may write cookies; a Server Component may not and keeps using `/api/auth/refresh`).
 *
 * The access token lives 10 minutes, so an editor left open for a while used to come back
 * to "session expired" and a reload that threw the form away. Here a missing or rejected
 * access token is renewed from the refresh token and the call is made once more; the
 * caller's form keeps its state either way. A 401 means the service refused before doing
 * anything, so the retry cannot apply a write twice. `expired` only when renewal fails.
 */
export async function withStaffToken<T>(
  requestId: string,
  run: (accessToken: string) => Promise<T>,
): Promise<StaffCall<T>> {
  const { accessToken, refreshToken } = await readStaffSession();

  if (!accessToken) {
    const fresh = await renew(refreshToken, requestId);
    return fresh ? { session: "ok", value: await run(fresh) } : { session: "expired" };
  }
  try {
    return { session: "ok", value: await run(accessToken) };
  } catch (error) {
    if (!isUnauthenticated(error)) throw error;
    const fresh = await renew(refreshToken, requestId);
    if (!fresh) return { session: "expired" };
    return { session: "ok", value: await run(fresh) };
  }
}
