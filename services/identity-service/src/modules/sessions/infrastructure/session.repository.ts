import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model, Types } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";
import type { UserType } from "@lavieco/shared/identity";

import type { SessionRepository } from "../application/ports/session-repository.port";
import type { Session } from "../domain/session";
import { SESSION_MODEL } from "./session.model";

type SessionDoc = {
  _id: Types.ObjectId;
  userId: string;
  userType: UserType;
  familyId: string;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
};

const toSession = (doc: SessionDoc): Session => ({
  id: doc._id.toHexString(),
  userId: doc.userId,
  userType: doc.userType,
  familyId: doc.familyId,
  expiresAt: doc.expiresAt,
  rotatedAt: doc.rotatedAt ?? null,
  revokedAt: doc.revokedAt ?? null,
});

@Injectable()
export class MongoSessionRepository implements SessionRepository {
  constructor(@InjectModel(SESSION_MODEL) private readonly model: Model<SessionDoc>) {}

  async create(
    input: {
      userId: string;
      userType: UserType;
      familyId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: TxContext,
  ) {
    const [doc] = await this.model.create([input], { session: sessionOf(tx) });
    return toSession(doc!.toObject() as SessionDoc);
  }

  async findByTokenHash(tokenHash: string) {
    const doc = await this.model.findOne({ tokenHash }).lean<SessionDoc>().exec();
    return doc ? toSession(doc) : null;
  }

  async markRotated(id: string, at: Date) {
    const result = await this.model.updateOne(
      { _id: id, rotatedAt: null, revokedAt: null },
      { $set: { rotatedAt: at, lastUsedAt: at } },
    );
    return result.modifiedCount === 1;
  }

  async revokeFamily(familyId: string, reason: string, at: Date) {
    await this.model.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } },
    );
  }

  async revokeAllForUser(userId: string, reason: string, at: Date, tx?: TxContext) {
    await this.model.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: at, revokedReason: reason } },
      { session: sessionOf(tx) },
    );
  }
}
