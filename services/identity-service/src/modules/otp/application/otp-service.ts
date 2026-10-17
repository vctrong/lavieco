import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import {
  OTP_RULES,
  TOKEN_AUDIENCES,
  type OtpChallengeCreateRequest,
  type OtpChallengeCreateResponse,
  type OtpChallengeVerifyResponse,
  type OtpPurpose,
} from "@lavieco/shared/identity";

import { constantTimeEqual, hmacSha256, randomDigits, randomToken } from "../../security";
import type { TokenSigner } from "../../signing-keys";
import { canStartMemberLogin, type UserRepository } from "../../users";
import { checkAttempt, mailFor } from "../domain/otp-challenge";
import type { OtpMailer, OtpRepository, RateLimiter } from "./ports/otp.ports";

/** Proof handed to the next step after a successful verification. */
export type VerifiedEmail = { emailNormalized: string; challengeId: string };

/**
 * Email OTP shared by sign-up, password reset, checkout and ticket lookup (docs/05 §3, §7):
 * 6 digits, 5 minutes, 5 attempts, 3 sends per 10 minutes per email, IP limit.
 */
export class OtpService {
  constructor(
    private readonly repository: OtpRepository,
    private readonly limiter: RateLimiter,
    private readonly mailer: OtpMailer,
    private readonly users: UserRepository,
    private readonly signer: TokenSigner,
    private readonly pepper: Buffer,
  ) {}

  async create(
    input: OtpChallengeCreateRequest,
    now = new Date(),
  ): Promise<OtpChallengeCreateResponse> {
    const emailNormalized = normalizeEmail(input.email);
    await this.enforceSendLimits(emailNormalized, input.purpose, input.clientIp, now);

    const challengeId = randomToken(16);
    const code = randomDigits(OTP_RULES.codeLength);
    const expiresAt = new Date(now.getTime() + OTP_RULES.ttlSeconds * 1000);
    await this.repository.insert({
      challengeId,
      emailNormalized,
      purpose: input.purpose,
      codeHash: this.hashCode(challengeId, code),
      expiresAt,
      attempts: 0,
      verifiedAt: null,
      consumedAt: null,
    });

    const user = await this.users.findByEmail(emailNormalized);
    const mail = mailFor(input.purpose, {
      exists: user !== null,
      isMember: user?.type === "member",
    });
    try {
      if (mail === "code") await this.mailer.sendCode(input.email.trim(), code, input.purpose);
      if (mail === "account_exists") await this.mailer.sendAccountExists(input.email.trim());
    } catch {
      await this.repository.delete(challengeId);
      throw new DomainError("common.unavailable", "email could not be sent");
    }

    return {
      challengeId,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(
        now.getTime() + OTP_RULES.resendCooldownSeconds * 1000,
      ).toISOString(),
    };
  }

  async verify(
    challengeId: string,
    code: string,
    now = new Date(),
  ): Promise<OtpChallengeVerifyResponse> {
    const challenge = await this.repository.findByChallengeId(challengeId);
    if (!challenge) throw new DomainError("otp.code_invalid");

    const check = checkAttempt(challenge, now);
    if (check === "expired") throw new DomainError("otp.expired");
    if (check === "attempts_exceeded") throw new DomainError("otp.attempts_exceeded");
    if (check === "already_used") throw new DomainError("otp.verification_invalid");

    const attempts = await this.repository.incrementAttempts(challengeId, OTP_RULES.maxAttempts);
    if (attempts === null) throw new DomainError("otp.attempts_exceeded");

    if (!constantTimeEqual(challenge.codeHash, this.hashCode(challengeId, code))) {
      const remaining = OTP_RULES.maxAttempts - attempts;
      if (remaining <= 0) throw new DomainError("otp.attempts_exceeded");
      throw new DomainError("otp.code_invalid", undefined, { remainingAttempts: remaining });
    }
    if (!(await this.repository.markVerified(challengeId, now))) {
      throw new DomainError("otp.verification_invalid");
    }

    const proof = await this.signer.sign(
      {
        audience: TOKEN_AUDIENCES.emailVerification,
        subject: challengeId,
        ttlSeconds: OTP_RULES.verificationTtlSeconds,
        claims: { email: challenge.emailNormalized, purpose: challenge.purpose },
      },
      now,
    );
    return { verificationToken: proof.token, expiresAt: proof.expiresAt.toISOString() };
  }

  /**
   * Proof of a signed-in member's own verified email, in the same format as an OTP
   * proof, so the checkout skips the code (docs/05 §2, ADR-0021). The consumer keeps
   * it single use by its `sub`; refused when the email was never verified.
   */
  async issueMemberProof(
    userId: string,
    purpose: Extract<OtpPurpose, "checkout">,
    now = new Date(),
  ): Promise<OtpChallengeVerifyResponse> {
    const user = await this.users.findById(userId);
    if (!user || !canStartMemberLogin(user) || user.emailVerifiedAt === null) {
      throw new DomainError("otp.verification_invalid");
    }
    const proof = await this.signer.sign(
      {
        audience: TOKEN_AUDIENCES.emailVerification,
        subject: randomToken(16),
        ttlSeconds: OTP_RULES.verificationTtlSeconds,
        claims: { email: user.emailNormalized, purpose, uid: user.id },
      },
      now,
    );
    return { verificationToken: proof.token, expiresAt: proof.expiresAt.toISOString() };
  }

  /**
   * Uses up a verification proof for `purpose` (single use, in the caller's
   * transaction). Throws `otp.verification_invalid` for anything else.
   */
  async consume(
    verificationToken: string,
    purpose: OtpPurpose,
    now: Date,
    tx?: TxContext,
  ): Promise<VerifiedEmail> {
    let claims: Record<string, unknown> & { sub: string };
    try {
      claims = await this.signer.verify(verificationToken, TOKEN_AUDIENCES.emailVerification);
    } catch {
      throw new DomainError("otp.verification_invalid");
    }
    if (claims.purpose !== purpose || typeof claims.email !== "string") {
      throw new DomainError("otp.verification_invalid");
    }
    if (!(await this.repository.consume(claims.sub, now, tx))) {
      throw new DomainError("otp.verification_invalid");
    }
    return { emailNormalized: claims.email, challengeId: claims.sub };
  }

  /**
   * Resend cooldown per email AND purpose (signing up then resetting a password right
   * away is legitimate); the 3-per-10-minutes cap is per email whatever the purpose.
   */
  private async enforceSendLimits(
    emailNormalized: string,
    purpose: OtpPurpose,
    clientIp: string | undefined,
    now: Date,
  ) {
    const checks = [
      {
        key: `otp:cooldown:${purpose}:${emailNormalized}`,
        limit: 1,
        window: OTP_RULES.resendCooldownSeconds,
      },
      {
        key: `otp:email:${emailNormalized}`,
        limit: OTP_RULES.maxSendsPerEmail,
        window: OTP_RULES.sendWindowSeconds,
      },
      ...(clientIp
        ? [
            {
              key: `otp:ip:${clientIp}`,
              limit: OTP_RULES.maxSendsPerIp,
              window: OTP_RULES.sendWindowSeconds,
            },
          ]
        : []),
    ];
    for (const check of checks) {
      const result = await this.limiter.hit(
        hmacSha256(this.pepper, check.key),
        check.limit,
        check.window,
        now,
      );
      if (!result.allowed) {
        throw new DomainError("otp.send_limited", undefined, {
          retryAfterSeconds: result.retryAfterSeconds,
        });
      }
    }
  }

  private hashCode(challengeId: string, code: string): string {
    return hmacSha256(this.pepper, `${challengeId}:${code}`);
  }
}
