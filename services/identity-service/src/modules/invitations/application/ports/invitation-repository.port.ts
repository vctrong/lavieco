import type { TxContext } from "@lavieco/service-kit/ports";
import type { Role } from "@lavieco/shared/permissions";

import type { Invitation } from "../../domain/invitation";

export const INVITATION_REPOSITORY = Symbol("INVITATION_REPOSITORY");

export interface InvitationRepository {
  insert(
    input: {
      userId: string;
      email: string;
      emailNormalized: string;
      roles: Role[];
      tokenHash: string;
      invitedBy: string;
      expiresAt: Date;
      purgeAt: Date;
    },
    tx?: TxContext,
  ): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  /** Stores the proposed TOTP seed once; returns the seed that is stored (first writer wins). */
  setPendingTotpSecret(id: string, sealed: string): Promise<string>;
  markAccepted(id: string, at: Date, purgeAt: Date, tx: TxContext): Promise<boolean>;
}
