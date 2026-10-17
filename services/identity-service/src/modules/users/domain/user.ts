import type { UserStatus, UserType } from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

/** A person who can sign in: staff (2FA mandatory) or member (docs/03 §4.1). */
export type User = {
  id: string;
  type: UserType;
  email: string;
  emailNormalized: string;
  displayName: string;
  /** Staff only; members hold no role. */
  roles: Role[];
  status: UserStatus;
  passwordHash: string | null;
  totp: { secretEnc: string; lastUsedStep: number | null } | null;
  recoveryCodes: { hash: string; usedAt: Date | null }[];
  googleSub: string | null;
  emailVerifiedAt: Date | null;
  /** Data-processing consent given at sign-up (BR-06). */
  consent: { version: string; at: Date } | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type NewUser = Pick<
  User,
  | "type"
  | "email"
  | "emailNormalized"
  | "displayName"
  | "roles"
  | "status"
  | "passwordHash"
  | "googleSub"
  | "emailVerifiedAt"
  | "consent"
> & { createdBy: string | null };

/** Brute-force protection on passwords and second factors (docs/02 §9.2). */
export const LOGIN_POLICY = { maxFailures: 5, lockMinutes: 15 } as const;

export function isLocked(user: Pick<User, "lockedUntil">, now: Date): boolean {
  return user.lockedUntil !== null && user.lockedUntil.getTime() > now.getTime();
}

/** State after one more failed attempt: locks for 15 minutes on the 5th failure. */
export function afterFailedAttempt(
  user: Pick<User, "failedLoginCount" | "lockedUntil">,
  now: Date,
): { failedLoginCount: number; lockedUntil: Date | null } {
  // A lock that already expired starts a fresh count.
  const base =
    user.lockedUntil !== null && user.lockedUntil.getTime() <= now.getTime()
      ? 0
      : user.failedLoginCount;
  const failedLoginCount = base + 1;
  if (failedLoginCount >= LOGIN_POLICY.maxFailures) {
    return {
      failedLoginCount: 0,
      lockedUntil: new Date(now.getTime() + LOGIN_POLICY.lockMinutes * 60_000),
    };
  }
  return { failedLoginCount, lockedUntil: null };
}

/** Only active staff with a configured second factor may open an admin session. */
export function canStartStaffLogin(user: User): boolean {
  return (
    user.type === "staff" &&
    user.status === "active" &&
    user.passwordHash !== null &&
    user.totp !== null
  );
}

export function canStartMemberLogin(user: User): boolean {
  return user.type === "member" && user.status === "active";
}
