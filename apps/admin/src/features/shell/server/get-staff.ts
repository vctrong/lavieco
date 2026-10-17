import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isServiceProblem } from "@lavieco/api-clients";
import type { StaffProfile } from "@lavieco/shared/identity";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";

/**
 * The signed-in staff member for the dashboard layout. Without a valid session it
 * redirects (refresh first, then login). Member tokens never reach this point: the
 * admin app only holds staff tokens and identity rejects other audiences.
 * Memoised per request: the layout and the page share one call to identity-service.
 */
export const requireStaff = cache(async function requireStaff(
  currentPath = "/",
): Promise<StaffProfile> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refreshUrl = `/api/auth/refresh?next=${encodeURIComponent(currentPath)}`;
  if (!accessToken) redirect(refreshToken ? refreshUrl : "/login");
  try {
    return await identityClient().getStaffProfile(accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refreshUrl : "/login");
    }
    throw error;
  }
});
