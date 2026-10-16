import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import type { Role } from "@lavieco/shared/permissions";

import type { InvitationRepository } from "../application/ports/invitation-repository.port";
import type { Invitation } from "../domain/invitation";
import { INVITATION_MODEL } from "./invitation.model";

type InvitationDoc = Omit<Invitation, "id"> & { _id: Types.ObjectId; roles: Role[] };

@Injectable()
export class MongoInvitationRepository implements InvitationRepository {
  constructor(@InjectModel(INVITATION_MODEL) private readonly model: Model<InvitationDoc>) {}

  async insert(input: Parameters<InvitationRepository["insert"]>[0], tx?: TxContext) {
    await this.model.create([input], { session: sessionOf(tx) });
  }

  async findByTokenHash(tokenHash: string) {
    const doc = await this.model.findOne({ tokenHash }).lean<InvitationDoc>().exec();
    if (!doc) return null;
    return {
      id: doc._id.toHexString(),
      userId: doc.userId,
      emailNormalized: doc.emailNormalized,
      roles: doc.roles,
      expiresAt: doc.expiresAt,
      acceptedAt: doc.acceptedAt ?? null,
      revokedAt: doc.revokedAt ?? null,
      pendingTotpSecretEnc: doc.pendingTotpSecretEnc ?? null,
    };
  }

  async setPendingTotpSecret(id: string, sealed: string) {
    await this.model.updateOne(
      { _id: id, pendingTotpSecretEnc: null },
      { $set: { pendingTotpSecretEnc: sealed } },
    );
    const doc = await this.model
      .findById(id, { pendingTotpSecretEnc: 1 })
      .lean<{ pendingTotpSecretEnc: string }>()
      .exec();
    return doc!.pendingTotpSecretEnc;
  }

  async markAccepted(id: string, at: Date, purgeAt: Date, tx: TxContext) {
    const result = await this.model.updateOne(
      { _id: id, acceptedAt: null, revokedAt: null },
      { $set: { acceptedAt: at, purgeAt } },
      { session: sessionOf(tx) },
    );
    return result.modifiedCount === 1;
  }
}
