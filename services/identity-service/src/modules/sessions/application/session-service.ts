import { randomUUID } from "node:crypto";

import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import { TOKEN_AUDIENCES, type TokenPair, type UserType } from "@lavieco/shared/identity";

import type { AuditRecorder } from "../../audit";
import { randomToken, sha256 } from "../../security";
import type { TokenSigner } from "../../signing-keys";
import type { User, UserRepository } from "../../users";
import { decideRefresh } from "../domain/session";
import type { SessionRepository } from "./ports/session-repository.port";

export type SessionPolicy = {
  staffAccessTtlSeconds: number;
  memberAccessTtlSeconds: number;
  staffRefreshTtlSeconds: number;
  memberRefreshTtlSeconds: number;
};

/** Issues, rotates and revokes sessions (access JWT + opaque refresh token). */
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly signer: TokenSigner,
    private readonly audit: AuditRecorder,
    private readonly policy: SessionPolicy,
  ) {}

  /** Opens a new login (a new token family). */
  issue(user: User, now = new Date(), tx?: TxContext): Promise<TokenPair> {
    return this.issueInFamily(user, randomUUID(), now, tx);
  }

  /**
   * Exchanges a refresh token for a new pair. Each token works once; presenting a
   * rotated token again revokes the whole family (stolen-token detection).
   * `expectedType` keeps the two BFFs apart: `web` refreshes members, `admin` staff.
   */
  async refresh(
    refreshToken: string,
    expectedType: UserType,
    now = new Date(),
  ): Promise<TokenPair> {
    const session = await this.sessions.findByTokenHash(sha256(refreshToken));
    const decision = decideRefresh(session, now);

    if (decision === "reuse_detected" && session) {
      await this.sessions.revokeFamily(session.familyId, "reuse_detected", now);
      await this.audit.record({
        action: "session.reuse_detected",
        actor: { userId: session.userId },
        target: { type: "session_family", id: session.familyId },
        result: "failure",
      });
      throw new DomainError("auth.session_invalid");
    }
    if (decision !== "rotate" || !session || session.userType !== expectedType) {
      throw new DomainError("auth.session_invalid");
    }
    if (!(await this.sessions.markRotated(session.id, now))) {
      // A concurrent refresh already used this token: treat as reuse.
      await this.sessions.revokeFamily(session.familyId, "reuse_detected", now);
      throw new DomainError("auth.session_invalid");
    }

    const user = await this.users.findById(session.userId);
    if (!user || user.status !== "active" || user.type !== expectedType) {
      await this.sessions.revokeFamily(session.familyId, "user_inactive", now);
      throw new DomainError("auth.session_invalid");
    }
    return this.issueInFamily(user, session.familyId, now);
  }

  async revoke(refreshToken: string, now = new Date()): Promise<void> {
    const session = await this.sessions.findByTokenHash(sha256(refreshToken));
    if (session) await this.sessions.revokeFamily(session.familyId, "logout", now);
  }

  revokeAllForUser(userId: string, reason: string, now: Date, tx?: TxContext) {
    return this.sessions.revokeAllForUser(userId, reason, now, tx);
  }

  private async issueInFamily(
    user: User,
    familyId: string,
    now: Date,
    tx?: TxContext,
  ): Promise<TokenPair> {
    const isStaff = user.type === "staff";
    const refreshToken = randomToken();
    const refreshTtl = isStaff
      ? this.policy.staffRefreshTtlSeconds
      : this.policy.memberRefreshTtlSeconds;
    const refreshExpiresAt = new Date(now.getTime() + refreshTtl * 1000);
    await this.sessions.create(
      {
        userId: user.id,
        userType: user.type,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
      },
      tx,
    );

    const access = await this.signer.sign(
      isStaff
        ? {
            audience: TOKEN_AUDIENCES.staff,
            subject: user.id,
            ttlSeconds: this.policy.staffAccessTtlSeconds,
            claims: { typ: "staff", roles: user.roles, sid: familyId },
          }
        : {
            audience: TOKEN_AUDIENCES.member,
            subject: user.id,
            ttlSeconds: this.policy.memberAccessTtlSeconds,
            claims: { typ: "member", sid: familyId },
          },
      now,
    );

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }
}
