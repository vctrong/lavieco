import "server-only";

import { notFound, redirect } from "next/navigation";

import { isServiceProblem, type IdentityClient } from "@lavieco/api-clients";
import type { ErrorCode } from "@lavieco/shared";

import { failureKind, refOf } from "@/lib/action-errors";
import { requestId } from "@/lib/request-meta";
import { adminLogger, identityClient } from "@/lib/services";
import { readStaffSession } from "@/lib/session";
import { withStaffToken } from "@/lib/staff-token";

import type { ActionResult, NotificationsFailure } from "../types";

const FAILURE_BY_CODE: Partial<Record<ErrorCode, NotificationsFailure>> = {
  "common.unauthenticated": "session_expired",
  "common.forbidden": "forbidden",
  "common.validation_failed": "invalid",
  "push.unavailable": "push_unavailable",
};

/**
 * identity-service call from a Server Action with the staff token (refreshed once if
 * needed). Logs codes only: never the push endpoint, which is a capability URL.
 */
export async function callIdentity<T>(
  context: string,
  run: (identity: IdentityClient, token: string, requestId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const id = await requestId();
  try {
    const call = await withStaffToken(id, (token) => run(identityClient(), token, id));
    if (call.session === "expired") return { status: "error", reason: "session_expired" };
    return { status: "ok", data: call.value };
  } catch (error) {
    if (isServiceProblem(error)) {
      const reason = FAILURE_BY_CODE[error.code];
      if (reason) return { status: "error", reason };
    }
    adminLogger().warn("notifications action failed", {
      context,
      requestId: id,
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
      ...(isServiceProblem(error) ? {} : failureKind(error)),
    });
    return { status: "error", reason: "unavailable", ref: refOf(id) };
  }
}

/** Page read: an expired token goes through the refresh route and comes back here. */
export async function readIdentity<T>(
  path: string,
  read: (identity: IdentityClient, token: string, requestId: string) => Promise<T>,
): Promise<T> {
  const { accessToken, refreshToken } = await readStaffSession();
  const refreshUrl = `/api/auth/refresh?next=${encodeURIComponent(path)}`;
  if (!accessToken) redirect(refreshToken ? refreshUrl : "/login");
  try {
    return await read(identityClient(), accessToken, await requestId());
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      redirect(refreshToken ? refreshUrl : "/login");
    }
    if (isServiceProblem(error) && error.status === 404) notFound();
    throw error;
  }
}
