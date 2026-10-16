import type { UnitOfWork } from "@lavieco/service-kit/ports";
import { DomainError, normalizeEmail } from "@lavieco/shared";
import type {
  InvitationAcceptRequest,
  InvitationAcceptResponse,
  InvitationInspectResponse,
} from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

import type { AuditRecorder } from "../../audit";
import {
  checkPassword,
  generateRecoveryCodes,
  generateTotpSecret,
  otpauthUri,
  randomToken,
  sha256,
  verifyTotp,
  type PasswordHasher,
  type SecretBox,
} from "../../security";
import type { UserRepository } from "../../users";
import { INVITATION_PURGE_DAYS, INVITATION_TTL_HOURS, isUsable } from "../domain/invitation";
import type { InvitationRepository } from "./ports/invitation-repository.port";

const DAY_MS = 86_400_000;

/**
 * Staff on-boarding: an invited person opens the link, sets a password and MUST
 * set up TOTP before the account becomes active (docs/02 §9.2, UC-27).
 */
export class InvitationService {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly secretBox: SecretBox,
    private readonly unitOfWork: UnitOfWork,
    private readonly audit: AuditRecorder,
  ) {}

  /**
   * Creates an invited staff account and its link token. Used by the one-time
   * `admin:create` command for the first Super Admin (no default account in seeds).
   * TODO(UC-27): endpoint for Super Admins to invite others (`user:manage`, step-up).
   */
  async create(
    input: { email: string; displayName: string; roles: Role[]; invitedBy: string },
    now = new Date(),
  ): Promise<{ token: string; expiresAt: Date }> {
    const emailNormalized = normalizeEmail(input.email);
    const token = randomToken();
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 3_600_000);
    await this.unitOfWork.run(async (tx) => {
      const user = await this.users.insert(
        {
          type: "staff",
          email: input.email.trim(),
          emailNormalized,
          displayName: input.displayName,
          roles: input.roles,
          status: "invited",
          passwordHash: null,
          googleSub: null,
          emailVerifiedAt: null,
          consent: null,
          createdBy: input.invitedBy,
        },
        tx,
      );
      await this.invitations.insert(
        {
          userId: user.id,
          email: input.email.trim(),
          emailNormalized,
          roles: input.roles,
          tokenHash: sha256(token),
          invitedBy: input.invitedBy,
          expiresAt,
          purgeAt: new Date(expiresAt.getTime() + INVITATION_PURGE_DAYS * DAY_MS),
        },
        tx,
      );
      await this.audit.record(
        {
          action: "invitation.created",
          actor: null,
          target: { type: "user", id: user.id },
          result: "success",
          meta: { by: input.invitedBy, roles: input.roles.join(",") },
        },
        tx,
      );
    });
    return { token, expiresAt };
  }

  async inspect(token: string, now = new Date()): Promise<InvitationInspectResponse> {
    const invitation = await this.invitations.findByTokenHash(sha256(token));
    if (!isUsable(invitation, now)) throw new DomainError("invitation.invalid");
    const user = await this.users.findById(invitation.userId);
    if (!user || user.status !== "invited") throw new DomainError("invitation.invalid");

    const sealed =
      invitation.pendingTotpSecretEnc ??
      (await this.invitations.setPendingTotpSecret(
        invitation.id,
        this.secretBox.seal(generateTotpSecret()),
      ));
    const secret = this.secretBox.open(sealed);
    return {
      email: user.email,
      displayName: user.displayName,
      totp: { secret, otpauthUri: otpauthUri(secret, user.email) },
    };
  }

  async accept(
    input: InvitationAcceptRequest,
    now = new Date(),
  ): Promise<InvitationAcceptResponse> {
    const invitation = await this.invitations.findByTokenHash(sha256(input.token));
    if (!isUsable(invitation, now) || !invitation.pendingTotpSecretEnc) {
      throw new DomainError("invitation.invalid");
    }
    const user = await this.users.findById(invitation.userId);
    if (!user || user.status !== "invited") throw new DomainError("invitation.invalid");

    if (!checkPassword(input.password, user.emailNormalized).ok) {
      throw new DomainError("password.too_weak");
    }
    const secret = this.secretBox.open(invitation.pendingTotpSecretEnc);
    const step = verifyTotp(secret, input.totpCode, now, null);
    if (step === null) throw new DomainError("invitation.totp_invalid");

    const recoveryCodes = generateRecoveryCodes();
    const passwordHash = await this.hasher.hash(input.password);
    await this.unitOfWork.run(async (tx) => {
      const accepted = await this.invitations.markAccepted(
        invitation.id,
        now,
        new Date(now.getTime() + INVITATION_PURGE_DAYS * DAY_MS),
        tx,
      );
      if (!accepted) throw new DomainError("invitation.invalid");
      await this.users.activateStaff(
        user.id,
        {
          displayName: input.displayName,
          passwordHash,
          totpSecretEnc: invitation.pendingTotpSecretEnc!,
          totpStep: step,
          recoveryCodeHashes: recoveryCodes.map(sha256),
          at: now,
        },
        tx,
      );
      await this.audit.record(
        {
          action: "invitation.accepted",
          actor: { userId: user.id, email: user.email, roles: user.roles },
          target: { type: "user", id: user.id },
          result: "success",
        },
        tx,
      );
    });
    return { recoveryCodes };
  }
}
