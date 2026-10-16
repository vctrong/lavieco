import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import { sessionOf } from "@lavieco/service-kit";
import type { TxContext } from "@lavieco/service-kit/ports";

import type { OtpRepository } from "../application/ports/otp.ports";
import type { OtpChallenge } from "../domain/otp-challenge";
import { OTP_CODE_MODEL, OTP_PURGE_AFTER_MS } from "./otp-code.model";

@Injectable()
export class MongoOtpRepository implements OtpRepository {
  constructor(@InjectModel(OTP_CODE_MODEL) private readonly model: Model<OtpChallenge>) {}

  async insert(challenge: OtpChallenge) {
    await this.model.create({
      ...challenge,
      purgeAt: new Date(challenge.expiresAt.getTime() + OTP_PURGE_AFTER_MS),
    });
  }

  async findByChallengeId(challengeId: string) {
    const doc = await this.model.findOne({ challengeId }).lean<OtpChallenge>().exec();
    if (!doc) return null;
    return {
      challengeId: doc.challengeId,
      emailNormalized: doc.emailNormalized,
      purpose: doc.purpose,
      codeHash: doc.codeHash,
      expiresAt: doc.expiresAt,
      attempts: doc.attempts,
      verifiedAt: doc.verifiedAt ?? null,
      consumedAt: doc.consumedAt ?? null,
    };
  }

  async incrementAttempts(challengeId: string, max: number) {
    const doc = await this.model
      .findOneAndUpdate(
        { challengeId, attempts: { $lt: max }, verifiedAt: null },
        { $inc: { attempts: 1 } },
        { new: true, projection: { attempts: 1 } },
      )
      .lean<{ attempts: number }>()
      .exec();
    return doc ? doc.attempts : null;
  }

  async markVerified(challengeId: string, at: Date) {
    const result = await this.model.updateOne(
      { challengeId, verifiedAt: null },
      { $set: { verifiedAt: at } },
    );
    return result.modifiedCount === 1;
  }

  async consume(challengeId: string, at: Date, tx?: TxContext) {
    const result = await this.model.updateOne(
      { challengeId, verifiedAt: { $ne: null }, consumedAt: null },
      { $set: { consumedAt: at } },
      { session: sessionOf(tx) },
    );
    return result.modifiedCount === 1;
  }

  async delete(challengeId: string) {
    await this.model.deleteOne({ challengeId });
  }
}
