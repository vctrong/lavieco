import type { OutboxPort, UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import type {
  MemberGoogleRequest,
  MemberPasswordResetRequest,
  MemberProfile,
  MemberRegisterRequest,
  TokenPair,
} from "@lavieco/shared/identity";

import type { AuditRecorder } from "../../audit";
import type { OtpService } from "../../otp";
import { checkPassword, type PasswordHasher } from "../../security";
import type { SessionService } from "../../sessions";
import {
  afterFailedAttempt,
  canStartMemberLogin,
  isLocked,
  type User,
  type UserRepository,
} from "../../users";
import type { GoogleIdentityProvider } from "./ports/google-identity.port";

/** Outbox job sent after a password reset ("was this you?" email). Payload: `{ userId }`. */
export const PASSWORD_CHANGED_JOB = "member.password_changed";

/**
 * Public accounts (docs/05 §2, ADR-0016): email + password after an email OTP, or
 * Google. Members never hold permissions; their tokens have their own audience.
 */
export class MemberAuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly googleProvider: GoogleIdentityProvider,
    private readonly unitOfWork: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditRecorder,
  ) {}

  /**
   * Creates the account once the email passed an OTP challenge (`purpose: signup`).
   * A Google-only account for the same email gets the password added instead.
   */
  async register(input: MemberRegisterRequest, now = new Date()): Promise<TokenPair> {
    const emailNormalized = normalizeEmail(input.email);
    if (!checkPassword(input.password, emailNormalized).ok)
      throw new DomainError("password.too_weak");
    const passwordHash = await this.hasher.hash(input.password);

    // TODO(docs/05 §5.5): once program-service exists, enqueue `member.email_verified`
    // here so guest orders with this email get attached to the new account.
    return this.unitOfWork.run(async (tx) => {
      const verified = await this.otp.consume(input.verificationToken, "signup", now, tx);
      if (verified.emailNormalized !== emailNormalized)
        throw new DomainError("otp.verification_invalid");

      const existing = await this.users.findByEmail(emailNormalized, tx);
      if (existing) {
        if (existing.type !== "member" || existing.passwordHash !== null) {
          throw new DomainError("member.email_taken");
        }
        await this.users.setPassword(existing.id, passwordHash, tx);
        return this.sessions.issue(existing, now, tx);
      }

      const user = await this.users.insert(
        {
          type: "member",
          email: input.email.trim(),
          emailNormalized,
          displayName: input.displayName,
          roles: [],
          status: "active",
          passwordHash,
          googleSub: null,
          emailVerifiedAt: now,
          consent: { version: input.consentVersion, at: now },
          createdBy: null,
        },
        tx,
      );
      return this.sessions.issue(user, now, tx);
    });
  }

  async login(email: string, password: string, now = new Date()): Promise<TokenPair> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !canStartMemberLogin(user) || user.passwordHash === null) {
      await this.hasher.verifyDummy(password);
      throw new DomainError("auth.invalid_credentials");
    }
    if (isLocked(user, now)) throw new DomainError("auth.account_locked");
    if (!(await this.hasher.verify(user.passwordHash, password))) {
      await this.users.recordFailedAttempt(user.id, afterFailedAttempt(user, now));
      throw new DomainError("auth.invalid_credentials");
    }
    await this.users.recordSuccessfulLogin(user.id, now);
    return this.sessions.issue(user, now);
  }

  /** Google sign-in for members only; a staff email is refused (admins keep 2FA). */
  async google(input: MemberGoogleRequest, now = new Date()): Promise<TokenPair> {
    if (!this.googleProvider.enabled)
      throw new DomainError("member.google_failed", "google sign-in disabled");
    let identity;
    try {
      identity = await this.googleProvider.exchange(input);
    } catch {
      throw new DomainError("member.google_failed");
    }
    if (!identity.emailVerified)
      throw new DomainError("member.google_failed", "email not verified");

    const linked = await this.users.findByGoogleSub(identity.sub);
    if (linked) return this.openMemberSession(linked, now);

    const emailNormalized = normalizeEmail(identity.email);
    const existing = await this.users.findByEmail(emailNormalized);
    if (existing) {
      if (existing.type !== "member") throw new DomainError("member.google_not_allowed");
      await this.users.linkGoogle(existing.id, identity.sub, now);
      return this.openMemberSession(existing, now);
    }

    if (!input.consentVersion) throw new DomainError("member.consent_required");
    const user = await this.users.insert({
      type: "member",
      email: identity.email,
      emailNormalized,
      displayName:
        (identity.name ?? emailNormalized.split("@")[0] ?? "").slice(0, 80) || "Thành viên",
      roles: [],
      status: "active",
      passwordHash: null,
      googleSub: identity.sub,
      emailVerifiedAt: now,
      consent: { version: input.consentVersion, at: now },
      createdBy: null,
    });
    return this.sessions.issue(user, now);
  }

  /** New password after an OTP (`purpose: reset_password`); every session is revoked. */
  async resetPassword(input: MemberPasswordResetRequest, now = new Date()): Promise<void> {
    await this.unitOfWork.run(async (tx) => {
      const verified = await this.otp.consume(input.verificationToken, "reset_password", now, tx);
      const user = await this.users.findByEmail(verified.emailNormalized, tx);
      if (!user || user.type !== "member") throw new DomainError("otp.verification_invalid");
      if (!checkPassword(input.newPassword, user.emailNormalized).ok) {
        throw new DomainError("password.too_weak");
      }
      await this.users.setPassword(user.id, await this.hasher.hash(input.newPassword), tx);
      await this.sessions.revokeAllForUser(user.id, "password_reset", now, tx);
      await this.outbox.enqueue(tx, { type: PASSWORD_CHANGED_JOB, payload: { userId: user.id } });
      await this.audit.record(
        {
          action: "member.password_reset",
          actor: { userId: user.id },
          target: { type: "user", id: user.id },
          result: "success",
        },
        tx,
      );
    });
  }

  async profile(userId: string): Promise<MemberProfile> {
    const user = await this.users.findById(userId);
    if (!user || !canStartMemberLogin(user)) throw new DomainError("common.unauthenticated");
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      hasPassword: user.passwordHash !== null,
      googleLinked: user.googleSub !== null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async openMemberSession(user: User, now: Date) {
    if (!canStartMemberLogin(user)) throw new DomainError("auth.invalid_credentials");
    await this.users.recordSuccessfulLogin(user.id, now);
    return this.sessions.issue(user, now);
  }
}
