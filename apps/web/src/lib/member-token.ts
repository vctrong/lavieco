import "server-only";

import {
  createSessionRefresher,
  isServiceProblem,
  type SessionRefresher,
} from "@lavieco/api-clients";

import { identityClient, webLogger } from "./services";
import { readMemberSession, setMemberSession } from "./session";

export type MemberCall<T> = { session: "ok"; value: T } | { session: "none" };

/**
 * One refresher per process, on `globalThis` because Next bundles this module into several
 * route chunks: `/api/auth/refresh` and a Server Action fired together must share it, or
 * they would rotate one refresh token twice and identity-service would revoke the session.
 */
const KEY = Symbol.for("lavieco.web.memberRefresher");
type Holder = { [KEY]?: SessionRefresher };

export function memberRefresher(): SessionRefresher {
  const holder = globalThis as Holder;
  holder[KEY] ??= createSessionRefresher((refreshToken, requestId) =>
    identityClient().refreshSession({ refreshToken }, requestId),
  );
  return holder[KEY];
}

const isUnauthenticated = (error: unknown) =>
  isServiceProblem(error) && error.code === "common.unauthenticated";

async function renew(refreshToken: string | null, requestId: string): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const tokens = await memberRefresher()(refreshToken, requestId);
    await setMemberSession(tokens);
    return tokens.accessToken;
  } catch (error) {
    webLogger().info("member session refresh failed", {
      requestId,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return null;
  }
}

/**
 * Runs a call with the member access token from a Server Action or Route Handler (they may
 * write cookies; Server Components keep redirecting through `/api/auth/refresh`).
 *
 * The access token lives 15 minutes: a member who filled the checkout slowly used to be
 * treated as a guest (OTP again, member vouchers refused). A missing or rejected access
 * token is renewed from the refresh token and the call made once more; a 401 is refused
 * before anything happens, so the retry never applies a write twice. `none` for a guest
 * or when renewal fails.
 */
export async function withMemberToken<T>(
  requestId: string,
  run: (accessToken: string) => Promise<T>,
): Promise<MemberCall<T>> {
  const { accessToken, refreshToken } = await readMemberSession();

  if (!accessToken) {
    const fresh = await renew(refreshToken, requestId);
    return fresh ? { session: "ok", value: await run(fresh) } : { session: "none" };
  }
  try {
    return { session: "ok", value: await run(accessToken) };
  } catch (error) {
    if (!isUnauthenticated(error)) throw error;
    const fresh = await renew(refreshToken, requestId);
    if (!fresh) return { session: "none" };
    return { session: "ok", value: await run(fresh) };
  }
}
