import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";
import type { MemberProfile } from "@lavieco/shared/identity";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { readMemberSession } from "@/lib/session";

export type AccountState =
  { kind: "anonymous" } | { kind: "needs_refresh" } | { kind: "member"; profile: MemberProfile };

/**
 * Who is viewing the account page. An expired access token with a refresh token left
 * means "rotate first" (Server Components cannot write cookies).
 */
export async function getAccountState(): Promise<AccountState> {
  const { accessToken, refreshToken } = await readMemberSession();
  if (!accessToken) return refreshToken ? { kind: "needs_refresh" } : { kind: "anonymous" };
  try {
    const profile = await identityClient().getMemberProfile(accessToken, await requestId());
    return { kind: "member", profile };
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      return refreshToken ? { kind: "needs_refresh" } : { kind: "anonymous" };
    }
    throw error;
  }
}
