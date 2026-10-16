import type { TxContext } from "@lavieco/service-kit/ports";

import type { NewUser, User } from "../../domain/user";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  findById(id: string, tx?: TxContext): Promise<User | null>;
  findByEmail(emailNormalized: string, tx?: TxContext): Promise<User | null>;
  findByGoogleSub(googleSub: string): Promise<User | null>;
  /** Throws `member.email_taken` when the normalized email already exists. */
  insert(user: NewUser, tx?: TxContext): Promise<User>;
  recordFailedAttempt(
    id: string,
    state: { failedLoginCount: number; lockedUntil: Date | null },
  ): Promise<void>;
  recordSuccessfulLogin(id: string, at: Date): Promise<void>;
  /** Atomically moves `lastUsedStep` forward; false if that step was already used (replay). */
  advanceTotpStep(id: string, step: number): Promise<boolean>;
  /** Atomically marks one unused recovery code as used; false if none matched. */
  consumeRecoveryCode(id: string, codeHash: string, at: Date): Promise<boolean>;
  /** Sets a new password and clears any lockout. */
  setPassword(id: string, passwordHash: string, tx?: TxContext): Promise<void>;
  linkGoogle(id: string, googleSub: string, verifiedAt: Date, tx?: TxContext): Promise<void>;
  activateStaff(
    id: string,
    input: {
      displayName: string;
      passwordHash: string;
      totpSecretEnc: string;
      totpStep: number;
      recoveryCodeHashes: string[];
      at: Date;
    },
    tx: TxContext,
  ): Promise<void>;
}
