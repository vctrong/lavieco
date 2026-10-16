import type { TxContext } from "@lavieco/service-kit/ports";
import type { UserType } from "@lavieco/shared/identity";

import type { Session } from "../../domain/session";

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");

export interface SessionRepository {
  create(
    input: {
      userId: string;
      userType: UserType;
      familyId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: TxContext,
  ): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  /** Marks a token as rotated only if it still is live; false when another request won. */
  markRotated(id: string, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, reason: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, reason: string, at: Date, tx?: TxContext): Promise<void>;
}
