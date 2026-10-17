"use server";

import { redirect } from "next/navigation";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { clearStaffSession, readStaffSession } from "@/lib/session";

/** Revokes the session family in identity-service, then clears the cookies. */
export async function logout() {
  const { refreshToken } = await readStaffSession();
  if (refreshToken) {
    try {
      await identityClient().revokeSession({ refreshToken }, await requestId());
    } catch {
      // Cookies are cleared anyway; the staff refresh token expires within hours.
    }
  }
  await clearStaffSession();
  redirect("/login");
}
