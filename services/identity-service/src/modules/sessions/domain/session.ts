import type { UserType } from "@lavieco/shared/identity";

/** One refresh token of a login (docs/03 §4.2). Tokens of the same login share a family. */
export type Session = {
  id: string;
  userId: string;
  userType: UserType;
  familyId: string;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
};

export type RefreshDecision = "rotate" | "invalid" | "reuse_detected";

/**
 * What to do with a presented refresh token. A token that was ALREADY rotated being
 * presented again means it leaked: the whole family is revoked (docs/03 §4.2).
 */
export function decideRefresh(session: Session | null, now: Date): RefreshDecision {
  if (!session) return "invalid";
  if (session.revokedAt) return "invalid";
  if (session.rotatedAt) return "reuse_detected";
  if (session.expiresAt.getTime() <= now.getTime()) return "invalid";
  return "rotate";
}
