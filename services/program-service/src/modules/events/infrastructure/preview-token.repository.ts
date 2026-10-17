import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";

import type { PreviewTokenRepository } from "../application/ports/preview-token-repository.port";
import { PREVIEW_TOKEN_MODEL } from "./event.model";

type PreviewTokenDoc = {
  _id: Types.ObjectId;
  tokenHash: string;
  eventId: Types.ObjectId;
  createdBy: string;
  expiresAt: Date;
};

@Injectable()
export class MongoPreviewTokenRepository implements PreviewTokenRepository {
  constructor(@InjectModel(PREVIEW_TOKEN_MODEL) private readonly model: Model<PreviewTokenDoc>) {}

  async insert(input: { tokenHash: string; eventId: string; createdBy: string; expiresAt: Date }) {
    await this.model.create({
      ...input,
      eventId: new Types.ObjectId(input.eventId),
      schemaVersion: 1,
    });
  }

  async findEventId(tokenHash: string, now: Date) {
    // The TTL index removes expired tokens eventually; the date check makes it exact.
    const doc = await this.model
      .findOne({ tokenHash, expiresAt: { $gt: now } }, { eventId: 1 })
      .lean<Pick<PreviewTokenDoc, "eventId">>()
      .exec();
    return doc ? doc.eventId.toHexString() : null;
  }
}
