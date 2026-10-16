import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types, mongo } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import { DomainError } from "@lavieco/shared";
import type { UserStatus, UserType } from "@lavieco/shared/identity";
import type { Role } from "@lavieco/shared/permissions";

import type { UserRepository } from "../application/ports/user-repository.port";
import type { NewUser, User } from "../domain/user";
import { USER_MODEL } from "./user.model";

type UserDoc = {
  _id: Types.ObjectId;
  type: UserType;
  email: string;
  emailNormalized: string;
  displayName: string;
  roles: Role[];
  status: UserStatus;
  passwordHash: string | null;
  mfa?: {
    totp: { secretEnc: string; lastUsedStep: number | null } | null;
    recoveryCodes: { hash: string; usedAt: Date | null }[];
  };
  googleSub?: string;
  emailVerifiedAt: Date | null;
  consent: { version: string; at: Date } | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

function toUser(doc: UserDoc): User {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    email: doc.email,
    emailNormalized: doc.emailNormalized,
    displayName: doc.displayName,
    roles: doc.roles ?? [],
    status: doc.status,
    passwordHash: doc.passwordHash ?? null,
    totp: doc.mfa?.totp
      ? { secretEnc: doc.mfa.totp.secretEnc, lastUsedStep: doc.mfa.totp.lastUsedStep ?? null }
      : null,
    recoveryCodes: (doc.mfa?.recoveryCodes ?? []).map((code) => ({
      hash: code.hash,
      usedAt: code.usedAt ?? null,
    })),
    googleSub: doc.googleSub ?? null,
    emailVerifiedAt: doc.emailVerifiedAt ?? null,
    consent: doc.consent ?? null,
    failedLoginCount: doc.failedLoginCount ?? 0,
    lockedUntil: doc.lockedUntil ?? null,
    lastLoginAt: doc.lastLoginAt ?? null,
    createdAt: doc.createdAt,
  };
}

const objectId = (id: string) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null);

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel(USER_MODEL) private readonly model: Model<UserDoc>) {}

  async findById(id: string, tx?: TxContext) {
    const _id = objectId(id);
    if (!_id) return null;
    const doc = await this.model
      .findById(_id)
      .session(sessionOf(tx) ?? null)
      .lean<UserDoc>()
      .exec();
    return doc ? toUser(doc) : null;
  }

  async findByEmail(emailNormalized: string, tx?: TxContext) {
    const doc = await this.model
      .findOne({ emailNormalized })
      .session(sessionOf(tx) ?? null)
      .lean<UserDoc>()
      .exec();
    return doc ? toUser(doc) : null;
  }

  async findByGoogleSub(googleSub: string) {
    const doc = await this.model.findOne({ googleSub }).lean<UserDoc>().exec();
    return doc ? toUser(doc) : null;
  }

  async insert(user: NewUser, tx?: TxContext): Promise<User> {
    try {
      const [created] = await this.model.create(
        [
          {
            type: user.type,
            email: user.email,
            emailNormalized: user.emailNormalized,
            displayName: user.displayName,
            roles: user.roles,
            status: user.status,
            passwordHash: user.passwordHash,
            ...(user.googleSub ? { googleSub: user.googleSub } : {}),
            emailVerifiedAt: user.emailVerifiedAt,
            consent: user.consent,
            createdBy: user.createdBy,
          },
        ],
        { session: sessionOf(tx) },
      );
      return toUser(created!.toObject() as UserDoc);
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new DomainError("member.email_taken");
      }
      throw error;
    }
  }

  async recordFailedAttempt(
    id: string,
    state: { failedLoginCount: number; lockedUntil: Date | null },
  ) {
    await this.model.updateOne({ _id: objectId(id) }, { $set: state, $inc: { revision: 1 } });
  }

  async recordSuccessfulLogin(id: string, at: Date) {
    await this.model.updateOne(
      { _id: objectId(id) },
      { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: at }, $inc: { revision: 1 } },
    );
  }

  async advanceTotpStep(id: string, step: number) {
    const result = await this.model.updateOne(
      {
        _id: objectId(id),
        "mfa.totp": { $ne: null },
        $or: [{ "mfa.totp.lastUsedStep": null }, { "mfa.totp.lastUsedStep": { $lt: step } }],
      },
      { $set: { "mfa.totp.lastUsedStep": step }, $inc: { revision: 1 } },
    );
    return result.modifiedCount === 1;
  }

  async consumeRecoveryCode(id: string, codeHash: string, at: Date) {
    const result = await this.model.updateOne(
      { _id: objectId(id), "mfa.recoveryCodes": { $elemMatch: { hash: codeHash, usedAt: null } } },
      { $set: { "mfa.recoveryCodes.$.usedAt": at }, $inc: { revision: 1 } },
    );
    return result.modifiedCount === 1;
  }

  async setPassword(id: string, passwordHash: string, tx?: TxContext) {
    await this.model.updateOne(
      { _id: objectId(id) },
      { $set: { passwordHash, failedLoginCount: 0, lockedUntil: null }, $inc: { revision: 1 } },
      { session: sessionOf(tx) },
    );
  }

  async linkGoogle(id: string, googleSub: string, verifiedAt: Date, tx?: TxContext) {
    await this.model.updateOne(
      { _id: objectId(id) },
      [
        {
          $set: {
            googleSub,
            emailVerifiedAt: { $ifNull: ["$emailVerifiedAt", verifiedAt] },
            revision: { $add: ["$revision", 1] },
          },
        },
      ],
      { session: sessionOf(tx) },
    );
  }

  async activateStaff(
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
  ) {
    await this.model.updateOne(
      { _id: objectId(id), type: "staff", status: "invited" },
      {
        $set: {
          displayName: input.displayName,
          passwordHash: input.passwordHash,
          status: "active",
          emailVerifiedAt: input.at,
          "mfa.totp": {
            secretEnc: input.totpSecretEnc,
            enabledAt: input.at,
            lastUsedStep: input.totpStep,
          },
          "mfa.recoveryCodes": input.recoveryCodeHashes.map((hash) => ({ hash, usedAt: null })),
        },
        $inc: { revision: 1 },
      },
      { session: sessionOf(tx) },
    );
  }
}
