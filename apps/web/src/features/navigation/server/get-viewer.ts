import "server-only";

import { isServiceProblem } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { contentClient, identityClient, webLogger } from "@/lib/services";
import { readMemberSession } from "@/lib/session";

import type { Viewer } from "../schemas";

const GUEST: Viewer = { kind: "guest" };
const NEEDS_REFRESH: Viewer = { kind: "needs_refresh" };

/** A content-service hiccup only costs the photo: the initials are shown instead. */
async function avatarPublicId(accessToken: string, id: string): Promise<string | null> {
  try {
    return (await contentClient().getMyAvatar(accessToken, id)).avatar?.publicId ?? null;
  } catch {
    return null;
  }
}

/**
 * Who is viewing, reduced to what the navigation shows. Never rotates the refresh
 * token: the browser does that under a Web Lock (one tab at a time), because
 * identity-service treats two concurrent rotations as token reuse and revokes the login.
 */
export async function getViewer(): Promise<Viewer> {
  const { accessToken, refreshToken } = await readMemberSession();
  // No identity call for visitors without a session.
  if (!accessToken) return refreshToken ? NEEDS_REFRESH : GUEST;
  try {
    const id = await requestId();
    const [profile, avatar] = await Promise.all([
      identityClient().getMemberProfile(accessToken, id),
      avatarPublicId(accessToken, id),
    ]);
    // TODO(nav-admin-flag): return `{ kind: "admin", ..., adminUrl }` once identity-service
    // tells whether a member may open the admin app. Nothing reports it yet.
    return {
      kind: "member",
      displayName: profile.displayName,
      email: profile.email,
      avatarPublicId: avatar,
    };
  } catch (error) {
    if (isServiceProblem(error) && error.status === 401) {
      return refreshToken ? NEEDS_REFRESH : GUEST;
    }
    throw error;
  }
}

/** `GET /api/account/viewer`. A failing service answers 503: the bar then shows a neutral icon. */
export async function handleViewerRequest(): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  try {
    return Response.json(await getViewer(), { headers });
  } catch (error) {
    webLogger().warn("viewer lookup failed", {
      errorCode: isServiceProblem(error) ? error.code : "unavailable",
    });
    return Response.json({ kind: "unavailable" }, { status: 503, headers });
  }
}
