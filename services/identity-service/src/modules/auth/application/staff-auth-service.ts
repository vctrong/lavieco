import { DomainError, normalizeEmail } from "@lavieco/shared";
import {
  STEP_UP_TTL_SECONDS,
  TOKEN_AUDIENCES,
  type StaffLoginResponse,
  type StaffProfile,
  type StepUpResponse,
  type TokenPair,
} from "@lavieco/shared/identity";
import { permissionsForRoles } from "@lavieco/shared/permissions";

import type { AuditRecorder } from "../../audit";
import { sha256, verifyTotp, type PasswordHasher, type SecretBox } from "../../security";
import type { SessionService } from "../../sessions";
import type { TokenSigner } from "../../signing-keys";
import {
  afterFailedAttempt,
  canStartStaffLogin,
  isLocked,
  type User,
  type UserRepository,
} from "../../users";

const MFA_TOKEN_TTL_SECONDS = 300;

/**
 * Staff sign-in, always two steps: password, then TOTP or a recovery code
 * (docs/02 §7.4, §9.2). Failures of either step count towards the same lockout.
 */
export class StaffAuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly secretBox: SecretBox,
    private readonly signer: TokenSigner,
    private readonly sessions: SessionService,
    private readonly audit: AuditRecorder,
  ) {}

  async login(email: string, password: string, now = new Date()): Promise<StaffLoginResponse> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !canStartStaffLogin(user)) {
      await this.hasher.verifyDummy(password);
      await this.recordFailure(null, "unknown_or_inactive");
      throw new DomainError("auth.invalid_credentials");
    }
    if (isLocked(user, now)) {
      await this.recordFailure(user, "locked");
      throw new DomainError("auth.account_locked");
    }
    if (!(await this.hasher.verify(user.passwordHash!, password))) {
      await this.users.recordFailedAttempt(user.id, afterFailedAttempt(user, now));
      await this.recordFailure(user, "bad_password");
      throw new DomainError("auth.invalid_credentials");
    }

    const mfa = await this.signer.sign(
      { audience: TOKEN_AUDIENCES.mfa, subject: user.id, ttlSeconds: MFA_TOKEN_TTL_SECONDS },
      now,
    );
    return { mfaToken: mfa.token, mfaTokenExpiresAt: mfa.expiresAt.toISOString() };
  }

  async verifySecondFactor(mfaToken: string, code: string, now = new Date()): Promise<TokenPair> {
    let userId: string;
    try {
      userId = (await this.signer.verify(mfaToken, TOKEN_AUDIENCES.mfa)).sub;
    } catch {
      throw new DomainError("auth.mfa_token_invalid");
    }
    const user = await this.users.findById(userId);
    if (!user || !canStartStaffLogin(user)) throw new DomainError("auth.mfa_token_invalid");
    if (isLocked(user, now)) throw new DomainError("auth.account_locked");

    const usedRecoveryCode = code.includes("-");
    const accepted = usedRecoveryCode
      ? await this.users.consumeRecoveryCode(user.id, sha256(code), now)
      : await this.acceptTotp(user, code, now);

    if (!accepted) {
      await this.users.recordFailedAttempt(user.id, afterFailedAttempt(user, now));
      await this.audit.record({
        action: "staff.second_factor",
        actor: { userId: user.id, email: user.email, roles: user.roles },
        result: "failure",
      });
      throw new DomainError("auth.mfa_code_invalid");
    }

    await this.users.recordSuccessfulLogin(user.id, now);
    await this.audit.record({
      action: usedRecoveryCode ? "staff.recovery_code_used" : "staff.login",
      actor: { userId: user.id, email: user.email, roles: user.roles },
      result: "success",
      ...(usedRecoveryCode
        ? { meta: { recoveryCodesLeft: user.recoveryCodes.filter((c) => !c.usedAt).length - 1 } }
        : {}),
    });
    return this.sessions.issue(user, now);
  }

  /**
   * Step-up before a sensitive action (ADR-0021): a fresh TOTP code (never a recovery
   * code) buys a 5-minute token bound to this user AND this session. Wrong codes count
   * towards the same lockout as sign-in.
   */
  async stepUp(
    userId: string,
    sessionId: string,
    code: string,
    now = new Date(),
  ): Promise<StepUpResponse> {
    const user = await this.users.findById(userId);
    if (!user || !canStartStaffLogin(user)) throw new DomainError("common.unauthenticated");
    if (isLocked(user, now)) throw new DomainError("auth.account_locked");
    if (!(await this.acceptTotp(user, code, now))) {
      await this.users.recordFailedAttempt(user.id, afterFailedAttempt(user, now));
      await this.audit.record({
        action: "staff.step_up",
        actor: { userId: user.id, email: user.email, roles: user.roles },
        result: "failure",
      });
      throw new DomainError("auth.mfa_code_invalid");
    }
    const token = await this.signer.sign(
      {
        audience: TOKEN_AUDIENCES.stepUp,
        subject: user.id,
        ttlSeconds: STEP_UP_TTL_SECONDS,
        claims: { sid: sessionId },
      },
      now,
    );
    await this.audit.record({
      action: "staff.step_up",
      actor: { userId: user.id, email: user.email, roles: user.roles },
      result: "success",
    });
    return { stepUpToken: token.token, expiresAt: token.expiresAt.toISOString() };
  }

  async profile(userId: string): Promise<StaffProfile> {
    const user = await this.users.findById(userId);
    if (!user || user.type !== "staff" || user.status !== "active") {
      throw new DomainError("common.unauthenticated");
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      permissions: permissionsForRoles(user.roles),
    };
  }

  private async acceptTotp(user: User, code: string, now: Date): Promise<boolean> {
    const secret = this.secretBox.open(user.totp!.secretEnc);
    const step = verifyTotp(secret, code, now, user.totp!.lastUsedStep);
    if (step === null) return false;
    // Atomic: the same code cannot open two sessions, even concurrently.
    return this.users.advanceTotpStep(user.id, step);
  }

  private recordFailure(user: User | null, reason: string) {
    return this.audit.record({
      action: "staff.login",
      actor: user ? { userId: user.id, email: user.email, roles: user.roles } : null,
      result: "failure",
      meta: { reason },
    });
  }
}
