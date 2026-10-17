import type { Role } from "@lavieco/shared/permissions";

/** Invitation of a staff member (docs/03 §4.3). The link is single-use and expires. */
export type Invitation = {
  id: string;
  userId: string;
  emailNormalized: string;
  roles: Role[];
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  /** TOTP seed proposed during set-up, sealed; becomes the user's seed on acceptance. */
  pendingTotpSecretEnc: string | null;
};

export const INVITATION_TTL_HOURS = 48;
/** Accepted/expired invitations are purged 30 days later (docs/03 §4.3). */
export const INVITATION_PURGE_DAYS = 30;

export function isUsable(invitation: Invitation | null, now: Date): invitation is Invitation {
  return (
    invitation !== null &&
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    invitation.expiresAt.getTime() > now.getTime()
  );
}
