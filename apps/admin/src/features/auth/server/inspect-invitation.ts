import "server-only";

import { toDataURL } from "qrcode";

import { isServiceProblem } from "@lavieco/api-clients";

import { requestId } from "@/lib/request-meta";
import { identityClient } from "@/lib/services";

export type InvitationView = {
  email: string;
  displayName: string;
  secret: string;
  /** PNG data URL of the otpauth:// URI, rendered on the server (no third-party QR service). */
  qrDataUrl: string;
};

/** Reads an invitation link; `null` when it is used, expired or revoked. */
export async function inspectInvitation(token: string | undefined): Promise<InvitationView | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  try {
    const result = await identityClient().inspectInvitation({ token }, await requestId());
    return {
      email: result.email,
      displayName: result.displayName,
      secret: result.totp.secret,
      qrDataUrl: await toDataURL(result.totp.otpauthUri, { margin: 1, width: 220 }),
    };
  } catch (error) {
    if (isServiceProblem(error, "invitation.invalid")) return null;
    throw error;
  }
}
