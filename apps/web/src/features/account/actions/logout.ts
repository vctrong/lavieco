"use server";

import { redirect } from "next/navigation";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { clearMemberSession, readMemberSession } from "@/lib/session";

/** Revokes the whole session family server-side, then clears the cookies. */
export async function logout() {
  const { refreshToken } = await readMemberSession();
  if (refreshToken) {
    try {
      await identityClient().revokeSession({ refreshToken }, await requestId());
    } catch {
      // The cookies are cleared anyway; the refresh token expires on its own.
    }
  }
  await clearMemberSession();
  redirect("/");
}
